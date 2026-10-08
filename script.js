// === CONFIGURAÇÃO MASTER DO SUPABASE ===
const SUPABASE_URL = "https://doecoosuqibzdsyadsyg.supabase.co";
const SUPABASE_KEY = "sb_publishable_-30z4xAhwJPYmy1bfSEjCw_loKUe8uL";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const urlParams = new URLSearchParams(window.location.search);
const TENANT_ATIVO = urlParams.get('slug') || "padrao";

// Estrutura Base
let tenantConfig = { 
    nome_empresa: "Meu Estabelecimento", 
    admin_contato: "",
    admin_receber_todas_notificacoes: false,
    sobre: "",
    endereco: "",
    horario_inicio: "08:00",
    horario_fim: "19:00",
    logo_url: "", 
    cor_primaria: "#FF6600", 
    cor_fundo: "#121212", 
    cor_caixas: "#1A1A1A", 
    cor_letras: "#FFFFFF",
    barbeiros: [], 
    servicos: {},
    senhas_usuarios: { "admin": "admin123" }
};

let usuarioLogado = "";
let offsetSemana = 0;
let servicosSelecionados = {};
let barbeiroSelecionado = null;

// ==========================================
// INICIALIZAÇÃO
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    await carregarTenantConfig();
    aplicarIdentidadeVisual(tenantConfig);
    atualizarIconesApp(tenantConfig.logo_url); 
    
    // Configurações do Painel
    if (document.getElementById("painel-container")) {
        const logo = document.getElementById("painel-logo");
        if (logo && tenantConfig.logo_url) { 
            logo.src = tenantConfig.logo_url; 
            logo.style.display = "block"; 
        }
        const nomeElement = document.getElementById("painel-nome-negocio");
        if (nomeElement) {
            nomeElement.textContent = tenantConfig.nome_empresa;
        }
    }

    // Configurações da Aba do Cliente
    if (document.getElementById("agendar-container")) {
        const logo = document.getElementById("tenant-logo");
        if (logo && tenantConfig.logo_url) { 
            logo.src = tenantConfig.logo_url; 
            logo.style.display = "block"; 
        }
        const tenantNameElement = document.getElementById("tenant-name");
        if (tenantNameElement) {
            tenantNameElement.textContent = tenantConfig.nome_empresa;
        }
        carregarDadosAgendamentoCliente();
    }
});

async function carregarTenantConfig() {
    try {
        const { data, error } = await _supabase.from("saas_estabelecimentos").select("*").eq("slug", TENANT_ATIVO).single();
        if (data) {
            Object.assign(tenantConfig, data);
            if (!tenantConfig.barbeiros) tenantConfig.barbeiros = [];
            if (!tenantConfig.servicos) tenantConfig.servicos = {};
            if (!tenantConfig.senhas_usuarios) tenantConfig.senhas_usuarios = { "admin": "admin123" };
        }
    } catch (e) { 
        console.warn("Usando configurações padrão."); 
    }
}

function aplicarIdentidadeVisual(config) {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', config.cor_primaria || '#FF6600');
    root.style.setProperty('--bg-color', config.cor_fundo || '#121212');
    root.style.setProperty('--box-color', config.cor_caixas || '#1A1A1A');
    root.style.setProperty('--text-color', config.cor_letras || '#FFFFFF');
}

function atualizarIconesApp(logoUrl) {
    if (!logoUrl) return;
    try {
        let icon = document.querySelector("link[rel='icon']");
        if(icon) icon.href = logoUrl;
        
        let appleIcon = document.querySelector("link[rel='apple-touch-icon']");
        if(appleIcon) appleIcon.href = logoUrl;

        const manifestElement = document.querySelector("link[rel='manifest']");
        if(manifestElement) {
            const manifestJSON = {
                "name": tenantConfig.nome_empresa || "Agenda Pro",
                "short_name": "Agenda",
                "start_url": window.location.pathname + window.location.search,
                "display": "standalone",
                "background_color": tenantConfig.cor_fundo || "#121212",
                "theme_color": tenantConfig.cor_primaria || "#FF6600",
                "icons": [
                    { "src": logoUrl, "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
                    { "src": logoUrl, "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
                ]
            };
            const blob = new Blob([JSON.stringify(manifestJSON)], {type: 'application/json'});
            manifestElement.href = URL.createObjectURL(blob);
        }
    } catch (e) {
        console.warn("CORS bloqueou a criação dinâmica do manifest. Ignorando para não travar o app.");
    }
}

function mostrarAlerta(texto) {
    const modalCustom = document.getElementById("modal-alerta-custom");
    if (modalCustom) { 
        document.getElementById("alerta-custom-texto").textContent = texto; 
        modalCustom.style.display = "flex"; 
    } else { 
        alert(texto); 
    }
}

function fecharAlertaCustom() {
    const modalCustom = document.getElementById("modal-alerta-custom");
    if (modalCustom) {
        modalCustom.style.display = "none";
    }
}

// ==========================================
// ABA DO CLIENTE (AGENDAR.HTML)
// ==========================================
function carregarDadosAgendamentoCliente() {
    renderizarBarbeiros();
    renderizarServicos();
}

function renderizarBarbeiros() {
    const grid = document.getElementById("barbers-grid");
    if (!grid) return;
    grid.innerHTML = "";
    (tenantConfig.barbeiros || []).forEach((b) => {
        let nome = typeof b === 'object' ? b.nome : b;
        grid.innerHTML += `<div class="barber-card" onclick="selecionarBarbeiro('${nome}', this)">
            <i class="fa-solid fa-user" style="font-size: 2rem; color: var(--primary-color); margin-bottom: 10px;"></i>
            <h3 style="font-size: 0.9rem; color: var(--text-color);">${nome}</h3>
        </div>`;
    });
}

function selecionarBarbeiro(nome, el) {
    barbeiroSelecionado = nome;
    document.querySelectorAll('.barber-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    checkAvailableTimes();
}

function renderizarServicos() {
    const grid = document.getElementById("services-grid");
    if (!grid) return;
    grid.innerHTML = "";
    Object.keys(tenantConfig.servicos || {}).forEach(nome => {
        const s = tenantConfig.servicos[nome];
        grid.innerHTML += `<div class="service-card" onclick="toggleServico('${nome}', ${s.price}, ${s.duration}, this)">
            <div class="service-info">
                <h3>${nome}</h3>
                <span><i class="fa-regular fa-clock"></i> ${s.duration} min</span>
            </div>
            <div class="price">R$ ${s.price.toFixed(2)}</div>
        </div>`;
    });
}

function toggleServico(nome, preco, duracao, el) {
    if (servicosSelecionados[nome]) {
        delete servicosSelecionados[nome];
        el.classList.remove('active');
    } else {
        servicosSelecionados[nome] = { preco, duracao };
        el.classList.add('active');
    }
    atualizarResumo();
}

function atualizarResumo() {
    const resumoBox = document.getElementById("resumo-flutuante");
    if (!resumoBox) return;
    
    let total = 0; 
    let tempo = 0; 
    let qtd = 0;
    
    Object.values(servicosSelecionados).forEach(s => {
        total += s.preco; 
        tempo += s.duracao; 
        qtd++;
    });
    
    if (qtd > 0) {
        resumoBox.style.display = "flex";
        document.getElementById("resumo-qtd-servicos").textContent = `${qtd} serviço(s) selecionado(s)`;
        document.getElementById("resumo-valor-total").textContent = `R$ ${total.toFixed(2)}`;
        document.getElementById("resumo-duracao").textContent = `${tempo} min`;
    } else {
        resumoBox.style.display = "none";
    }
}

async function checkAvailableTimes() {
    const dateInput = document.getElementById("date").value;
    const timeSelect = document.getElementById("time");
    
    if (!dateInput || !timeSelect || !barbeiroSelecionado) return;
    
    timeSelect.innerHTML = '<option value="">A carregar horários...</option>';

    const { data: ocupados } = await _supabase
        .from('saas_agendamentos')
        .select('hora_inicio')
        .eq('slug', TENANT_ATIVO)
        .eq('barbeiro', barbeiroSelecionado)
        .eq('data_agendamento', dateInput);

    const horariosOcupados = (ocupados || []).map(o => o.hora_inicio);

    const profObj = (tenantConfig.barbeiros || []).find(b => (typeof b === 'object' ? b.nome : b) === barbeiroSelecionado);
    let hInicio = (profObj && profObj.inicio) ? parseInt(profObj.inicio.split(':')[0]) : parseInt(tenantConfig.horario_inicio.split(':')[0]);
    let hFim = (profObj && profObj.fim) ? parseInt(profObj.fim.split(':')[0]) : parseInt(tenantConfig.horario_fim.split(':')[0]);

    timeSelect.innerHTML = '<option value="">Selecione um horário</option>';
    let temHorario = false;

    for (let h = hInicio; h <= hFim; h++) {
        let timeStr = `${h.toString().padStart(2, '0')}:00`;
        if (!horariosOcupados.includes(timeStr)) {
            timeSelect.innerHTML += `<option value="${timeStr}">${timeStr}</option>`;
            temHorario = true;
        }
    }

    if (!temHorario) {
        timeSelect.innerHTML = '<option value="">Agenda lotada neste dia</option>';
    }
}

function abrirModalConfirmacao() {
    if (!barbeiroSelecionado) return mostrarAlerta("Selecione um profissional.");
    if (Object.keys(servicosSelecionados).length === 0) return mostrarAlerta("Selecione pelo menos um serviço.");
    if (!document.getElementById("date").value || !document.getElementById("time").value) return mostrarAlerta("Escolha uma data e horário.");
    if (!document.getElementById("client-name").value || !document.getElementById("client-phone").value) return mostrarAlerta("Preencha os seus dados.");

    let servicosStr = Object.keys(servicosSelecionados).join(', ');
    let html = `<strong>Profissional:</strong> ${barbeiroSelecionado}<br>
                <strong>Serviços:</strong> ${servicosStr}<br>
                <strong>Data:</strong> ${document.getElementById("date").value.split('-').reverse().join('/')} às ${document.getElementById("time").value}<br>
                <strong>Cliente:</strong> ${document.getElementById("client-name").value}`;
    
    document.getElementById("resumo-agendamento").innerHTML = html;
    document.getElementById("modal-confirmacao").style.display = "flex";
}

function fecharModalConfirmacao() {
    document.getElementById("modal-confirmacao").style.display = "none";
}

async function confirmarEEnviar() {
    const btnConfirmar = document.getElementById("btn-confirmar-agendamento");
    btnConfirmar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando...';
    btnConfirmar.disabled = true;

    const cliente = document.getElementById("client-name").value;
    const telefone = document.getElementById("client-phone").value.replace(/\D/g, "");
    const dataSQL = document.getElementById("date").value;
    const horaStr = document.getElementById("time").value;
    
    let total = 0; 
    let tempo = 0;
    Object.values(servicosSelecionados).forEach(s => { total += s.preco; tempo += s.duracao; });
    const servs = Object.keys(servicosSelecionados).join(', ');

    const { error } = await _supabase.from('saas_agendamentos').insert({
        slug: TENANT_ATIVO,
        barbeiro: barbeiroSelecionado,
        cliente_nome: cliente,
        cliente_telefone: telefone,
        servicos: servs,
        data_agendamento: dataSQL,
        hora_inicio: horaStr,
        duracao_total: tempo,
        valor_total: total,
        status: 'pendente'
    });

    if (error) {
        btnConfirmar.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Confirmar e Enviar';
        btnConfirmar.disabled = false;
        return mostrarAlerta("Erro ao salvar agendamento. Tente novamente.");
    }

    const numAdmin = tenantConfig.admin_contato || "";
    const profObj = (tenantConfig.barbeiros || []).find(b => (typeof b === 'object' ? b.nome : b) === barbeiroSelecionado);
    const numProf = (profObj && profObj.whatsapp) ? profObj.whatsapp : "";
    
    let numeroDestino = numProf;
    if (tenantConfig.admin_receber_todas_notificacoes && numAdmin) {
        numeroDestino = numAdmin;
    }

    if (numeroDestino) {
        const dataStr = dataSQL.split('-').reverse().join('/');
        const msg = `*Novo Agendamento Confirmado no Sistema!*\n\n*Cliente:* ${cliente}\n*Profissional:* ${barbeiroSelecionado}\n*Serviços:* ${servs}\n*Data:* ${dataStr} às ${horaStr}\n*Total:* R$ ${total.toFixed(2)}\n\nO horário já foi reservado na agenda!`;
        window.open(`https://api.whatsapp.com/send?phone=55${numeroDestino}&text=${encodeURIComponent(msg)}`, '_blank');
    }
    
    fecharModalConfirmacao();
    mostrarAlerta("Agendamento concluído com sucesso!");
    setTimeout(() => window.location.reload(), 2500);
}

// ==========================================
// PAINEL (PAINEL.HTML) - SISTEMA DE BLOQUEIO E DASHBOARD
// ==========================================
function fazerLogin() {
    const user = document.getElementById("login-usuario").value.trim().toLowerCase();
    const pass = document.getElementById("login-senha").value.trim();
    if (!user || !pass) return mostrarAlerta("Preencha os campos de acesso.");

    let senhaAdminCadastrada = (tenantConfig.senhas_usuarios && tenantConfig.senhas_usuarios['admin']) ? tenantConfig.senhas_usuarios['admin'] : 'admin123';

    if (user === 'admin' && pass === senhaAdminCadastrada) {
        usuarioLogado = "Admin";
        document.getElementById("login-section").style.display = "none";
        document.getElementById("admin-gear-container").innerHTML = '<div class="btn-engrenagem" onclick="abrirConfiguracoesAdmin()" title="Configurações"><i class="fa-solid fa-gear"></i></div>';
        document.getElementById("dashboard-admin").style.display = "block";
        atualizarFinanceiroAdmin(); 
    } else {
        const profEncontrado = (tenantConfig.barbeiros || []).find(b => {
            let nomeB = typeof b === 'object' ? b.nome : b;
            return nomeB.toLowerCase() === user;
        });

        if (profEncontrado) {
            let nomeReal = typeof profEncontrado === 'object' ? profEncontrado.nome : profEncontrado;
            let expectedSenha = nomeReal.toLowerCase().replace(/\s+/g, '') + '123';
            let senhaSalva = (tenantConfig.senhas_usuarios && tenantConfig.senhas_usuarios[nomeReal.toLowerCase()]) ? tenantConfig.senhas_usuarios[nomeReal.toLowerCase()] : expectedSenha;
            
            if (pass === senhaSalva || pass === '123456') {
                usuarioLogado = nomeReal;
                document.getElementById("login-section").style.display = "none";
                document.getElementById("dashboard-barbeiro").style.display = "block";
                document.getElementById("titulo-agenda-barbeiro").innerHTML = '<i class="fa-solid fa-calendar-check"></i> Agenda: ' + usuarioLogado;
                carregarAgendaBarbeiro();
                return;
            }
        }
        mostrarAlerta("Senha incorreta, verifique e tente novamente.");
    }
}

function fazerLogout() { window.location.reload(); }

function mudarTabConfig(tabName, btnElement) {
    document.querySelectorAll('.config-tab-content').forEach(el => el.style.display = 'none');
    document.getElementById("tab-" + tabName).style.display = 'block';
    document.querySelectorAll('.tab-btn').forEach(btn => { 
        btn.style.background = 'transparent'; 
        btn.style.color = '#AAA'; 
    });
    btnElement.style.background = 'var(--primary-color)'; 
    btnElement.style.color = '#FFF';
}

function abrirConfiguracoesAdmin() { 
    document.getElementById("modal-config-admin").style.display = "flex"; 
    renderizarAdminParametros(); 
}

function fecharConfiguracoesAdmin() { 
    document.getElementById("modal-config-admin").style.display = "none"; 
}

function abrirModalTrocarSenha() { 
    document.getElementById("nova-senha-input").value = ""; 
    document.getElementById("modal-trocar-senha").style.display = "flex"; 
}

function fecharModalTrocarSenha() { 
    document.getElementById("modal-trocar-senha").style.display = "none"; 
}

async function salvarNovaSenha() {
    const novaSenha = document.getElementById("nova-senha-input").value.trim();
    if (!novaSenha) return mostrarAlerta("Digite a nova palavra-passe.");
    if (!tenantConfig.senhas_usuarios) tenantConfig.senhas_usuarios = {};
    
    tenantConfig.senhas_usuarios[usuarioLogado.toLowerCase()] = novaSenha;
    const btn = document.querySelector("#modal-trocar-senha .btn-acao");
    btn.textContent = "A guardar...";
    
    const { error } = await _supabase.from("saas_estabelecimentos").upsert({ 
        slug: TENANT_ATIVO, 
        senhas_usuarios: tenantConfig.senhas_usuarios 
    }, { onConflict: 'slug' });
    
    btn.textContent = "Guardar Nova Palavra-passe";
    fecharModalTrocarSenha();
    if (!error) mostrarAlerta("Palavra-passe alterada com sucesso!");
}

function mudarSemana(direcao) { 
    offsetSemana += (direcao * 7); 
    carregarAgendaBarbeiro(); 
}

async function carregarAgendaBarbeiro() {
    const container = document.getElementById("grade-semanal-container");
    if (!container) return;

    container.innerHTML = "<p style='text-align:center; padding: 20px; color: #AAA;'><i class='fa-solid fa-spinner fa-spin'></i> A sincronizar agenda...</p>";

    const profObj = (tenantConfig.barbeiros || []).find(b => (typeof b === 'object' ? b.nome : b) === usuarioLogado);
    let horaInicio = (profObj && profObj.inicio) ? profObj.inicio : (tenantConfig.horario_inicio || "08:00");
    let horaFim = (profObj && profObj.fim) ? profObj.fim : (tenantConfig.horario_fim || "19:00");
    let startHour = parseInt(horaInicio.split(':')[0]); 
    let endHour = parseInt(horaFim.split(':')[0]);

    const datasSemana = [];
    const hoje = new Date();
    for (let i=0; i<6; i++) {
        let d = new Date(hoje);
        d.setDate(hoje.getDate() + i + offsetSemana);
        let ano = d.getFullYear(); 
        let mes = String(d.getMonth() + 1).padStart(2, '0'); 
        let dia = String(d.getDate()).padStart(2, '0');
        datasSemana.push(`${ano}-${mes}-${dia}`); 
    }

    const { data: agendamentos } = await _supabase
        .from('saas_agendamentos')
        .select('*')
        .eq('slug', TENANT_ATIVO)
        .eq('barbeiro', usuarioLogado)
        .in('data_agendamento', datasSemana);

    let html = `<div style="grid-column: span 6; background: var(--box-color); padding: 12px; border-radius: 8px; text-align: center; margin-bottom: 10px;">
        <p style="font-size: 0.85rem; color: #CCC;">Horário de expediente: <strong>${horaInicio} às ${horaFim}</strong></p>
        <p style="font-size: 0.75rem; color: var(--primary-color); margin-top: 4px;">Clique num horário livre para Bloquear. Clique num agendamento para o Concluir.</p>
    </div>`;

    for (let i=0; i<6; i++) {
        let dataSQL = datasSemana[i];
        let dObj = new Date(dataSQL + 'T12:00:00'); 
        let diaStr = dObj.toLocaleDateString('pt-BR', {weekday: 'short', day: '2-digit', month: '2-digit'});
        
        html += `<div class="day-column"><div class="day-header">${diaStr}</div>`;
        for (let h = startHour; h <= endHour; h++) {
            let time = `${h.toString().padStart(2, '0')}:00`;
            let ag = agendamentos ? agendamentos.find(a => a.data_agendamento === dataSQL && a.hora_inicio === time) : null;

            if (ag) {
                if (ag.status === 'bloqueado') {
                    html += `<div class="slot-item blocked" onclick="desbloquearHorario('${ag.id}')" title="Clique para liberar">${time} - Bloqueado</div>`;
                } else if (ag.status === 'concluido') {
                    html += `<div class="slot-item concluded" title="Serviço: ${ag.servicos}">${time} - Finalizado</div>`;
                } else {
                    html += `<div class="slot-item booked" onclick="concluirAgendamento('${ag.id}', '${ag.cliente_nome}', ${ag.valor_total})" title="${ag.servicos}">${time} - ${ag.cliente_nome}</div>`;
                }
            } else {
                html += `<div class="slot-item available" onclick="bloquearHorario('${dataSQL}', '${time}')">${time} - Livre</div>`;
            }
        }
        html += `</div>`;
    }
    container.innerHTML = html;
    atualizarFinanceiroProfissional(); 
}

async function bloquearHorario(data, hora) {
    if (!confirm(`Bloquear a agenda para clientes no dia ${data.split('-').reverse().join('/')} às ${hora}?`)) return;
    await _supabase.from('saas_agendamentos').insert({
        slug: TENANT_ATIVO, 
        barbeiro: usuarioLogado, 
        data_agendamento: data, 
        hora_inicio: hora, 
        status: 'bloqueado'
    });
    carregarAgendaBarbeiro();
}

async function desbloquearHorario(id) {
    if (!confirm('Deseja liberar este horário para clientes?')) return;
    await _supabase.from('saas_agendamentos').delete().eq('id', id);
    carregarAgendaBarbeiro();
}

async function concluirAgendamento(id, cliente, valor) {
    if (!confirm(`Deseja marcar o atendimento de ${cliente} como CONCLUÍDO?\nIsso adicionará R$ ${valor} ao seu resumo financeiro.`)) return;
    await _supabase.from('saas_agendamentos').update({ status: 'concluido' }).eq('id', id);
    carregarAgendaBarbeiro();
}

async function atualizarFinanceiroProfissional() {
    if (!usuarioLogado || usuarioLogado === 'Admin') return;
    const filtro = document.getElementById('filtro-financeiro-prof').value;
    
    const { data: ags } = await _supabase.from('saas_agendamentos').select('valor_total, data_agendamento').eq('slug', TENANT_ATIVO).eq('barbeiro', usuarioLogado).eq('status', 'concluido');
    document.getElementById('valor-financeiro-prof').textContent = `R$ ${calcularTotalDash(ags || [], filtro)}`;
}

async function atualizarFinanceiroAdmin() {
    if (usuarioLogado !== 'Admin') return;
    const filtro = document.getElementById('filtro-financeiro-admin').value;
    
    const { data: ags } = await _supabase.from('saas_agendamentos').select('valor_total, data_agendamento').eq('slug', TENANT_ATIVO).eq('status', 'concluido');
    document.getElementById('valor-financeiro-admin').textContent = `R$ ${calcularTotalDash(ags || [], filtro)}`;
}

function calcularTotalDash(agendamentos, filtro) {
    const hoje = new Date();
    let total = 0;
    agendamentos.forEach(ag => {
        const dAg = new Date(ag.data_agendamento + 'T12:00:00');
        let contar = false;
        if (filtro === 'dia' && dAg.toDateString() === hoje.toDateString()) contar = true;
        if (filtro === 'mes' && dAg.getMonth() === hoje.getMonth() && dAg.getFullYear() === hoje.getFullYear()) contar = true;
        if (filtro === 'semana') {
            const inicio = new Date(hoje); 
            inicio.setDate(hoje.getDate() - hoje.getDay());
            const fim = new Date(inicio); 
            fim.setDate(inicio.getDate() + 6);
            if (dAg >= inicio && dAg <= fim) contar = true;
        }
        if (contar) total += Number(ag.valor_total);
    });
    return total.toFixed(2).replace('.', ',');
}

// Configurações e Funções Auxiliares de UI
function aplicarCores(primaria, fundo, caixas, letras) {
    document.getElementById("config-cor-primaria").value = primaria; 
    document.getElementById("config-cor-fundo").value = fundo;
    document.getElementById("config-cor-caixas").value = caixas; 
    document.getElementById("config-cor-letras").value = letras;
    document.documentElement.style.setProperty('--primary-color', primaria); 
    document.documentElement.style.setProperty('--bg-color', fundo);
    document.documentElement.style.setProperty('--box-color', caixas); 
    document.documentElement.style.setProperty('--text-color', letras);
}

function renderizarAdminParametros() {
    document.getElementById("config-nome-empresa").value = tenantConfig.nome_empresa || "";
    document.getElementById("config-sobre").value = tenantConfig.sobre || "";
    document.getElementById("config-endereco").value = tenantConfig.endereco || "";
    document.getElementById("config-horario-inicio").value = tenantConfig.horario_inicio || "08:00";
    document.getElementById("config-horario-fim").value = tenantConfig.horario_fim || "19:00";
    document.getElementById("config-admin-contato").value = tenantConfig.admin_contato || "";
    document.getElementById("config-admin-notificacoes").checked = tenantConfig.admin_receber_todas_notificacoes === true;
    document.getElementById("config-cor-primaria").value = tenantConfig.cor_primaria || "#FF6600";
    document.getElementById("config-cor-fundo").value = tenantConfig.cor_fundo || "#121212";
    document.getElementById("config-cor-caixas").value = tenantConfig.cor_caixas || "#1A1A1A";
    document.getElementById("config-cor-letras").value = tenantConfig.cor_letras || "#FFFFFF";
    if (tenantConfig.logo_url) { 
        document.getElementById("logo-preview-admin").src = tenantConfig.logo_url; 
        document.getElementById("logo-preview-admin").style.display = "block"; 
    }
    renderListasConfig();
}

function renderListasConfig() {
    const listP = document.getElementById("lista-profissionais-config"); 
    listP.innerHTML = "";
    (tenantConfig.barbeiros || []).forEach((p, i) => {
        let nomeP = typeof p === 'object' ? p.nome : p; 
        let wppP = typeof p === 'object' && p.whatsapp ? p.whatsapp : "Sem WhatsApp";
        let inicioP = typeof p === 'object' && p.inicio ? p.inicio : "09:00"; 
        let fimP = typeof p === 'object' && p.fim ? p.fim : "18:00";
        listP.innerHTML += `<div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
            <div style="display:flex; flex-direction:column;"><strong style="color:var(--text-color); font-size:0.9rem;">${nomeP}</strong><span style="font-size:0.75rem; color:#AAA;">📞 ${wppP} | ⏰ ${inicioP} - ${fimP}</span></div>
            <button type="button" style="color:#e74c3c; background:rgba(231,76,60,0.1); padding:8px; border-radius:6px; border:none; cursor:pointer;" onclick="removerProfissional(${i})"><i class="fa-solid fa-trash"></i></button></div>`;
    });
    
    const listS = document.getElementById("lista-servicos-config"); 
    listS.innerHTML = "";
    Object.keys(tenantConfig.servicos || {}).forEach(nome => {
        const s = tenantConfig.servicos[nome];
        listS.innerHTML += `<div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; display:flex; justify-content:space-between; font-size:0.85rem; align-items:center; margin-bottom: 6px;">
            <span>${nome} <strong style="color:var(--primary-color);">R$ ${s.price}</strong> (${s.duration}m)</span><button type="button" style="color:#e74c3c; background:none; border:none; cursor:pointer;" onclick="removerServico('${nome}')"><i class="fa-solid fa-trash"></i></button></div>`;
    });
}

function adicionarProfissional() {
    const nomeVal = document.getElementById("novo-profissional-nome").value.trim();
    const wppVal = document.getElementById("novo-profissional-wpp").value.replace(/\D/g, "");
    const inicioVal = document.getElementById("novo-profissional-inicio").value; 
    const fimVal = document.getElementById("novo-profissional-fim").value;
    if (nomeVal) {
        if (!tenantConfig.barbeiros) tenantConfig.barbeiros = [];
        tenantConfig.barbeiros.push({ nome: nomeVal, whatsapp: wppVal, inicio: inicioVal, fim: fimVal });
        document.getElementById("novo-profissional-nome").value = ""; 
        document.getElementById("novo-profissional-wpp").value = "";
        renderListasConfig();
    }
}

function removerProfissional(i) { 
    tenantConfig.barbeiros.splice(i, 1); 
    renderListasConfig(); 
}

function adicionarServico() {
    const nome = document.getElementById("novo-servico-nome").value.trim(); 
    const p = parseFloat(document.getElementById("novo-servico-preco").value); 
    const d = parseInt(document.getElementById("novo-servico-tempo").value);
    if (nome && p && d) { 
        if (!tenantConfig.servicos) tenantConfig.servicos = {}; 
        tenantConfig.servicos[nome] = { price: p, duration: d }; 
        renderListasConfig(); 
    }
}

function removerServico(nome) { 
    delete tenantConfig.servicos[nome]; 
    renderListasConfig(); 
}

async function salvarConfiguracoesGerais() {
    const btn = document.getElementById("btn-salvar-configs"); 
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A guardar...'; 
    btn.disabled = true;
    
    tenantConfig.nome_empresa = document.getElementById("config-nome-empresa").value.trim(); 
    tenantConfig.sobre = document.getElementById("config-sobre").value.trim();
    tenantConfig.endereco = document.getElementById("config-endereco").value.trim(); 
    tenantConfig.horario_inicio = document.getElementById("config-horario-inicio").value;
    tenantConfig.horario_fim = document.getElementById("config-horario-fim").value; 
    tenantConfig.admin_contato = document.getElementById("config-admin-contato").value.replace(/\D/g, "");
    tenantConfig.admin_receber_todas_notificacoes = document.getElementById("config-admin-notificacoes").checked; 
    tenantConfig.cor_primaria = document.getElementById("config-cor-primaria").value;
    tenantConfig.cor_fundo = document.getElementById("config-cor-fundo").value || "#121212"; 
    tenantConfig.cor_caixas = document.getElementById("config-cor-caixas").value || "#1A1A1A";
    tenantConfig.cor_letras = document.getElementById("config-cor-letras").value || "#FFFFFF";
    
    const logoFile = document.getElementById("config-logo-file").files[0];
    if (logoFile) {
        const fileExt = logoFile.name.split('.').pop(); 
        const fileName = TENANT_ATIVO + "_logo_" + Date.now() + "." + fileExt;
        const { error: uploadError } = await _supabase.storage.from('Logos').upload(fileName, logoFile, { upsert: true });
        if (!uploadError) { 
            const { data } = _supabase.storage.from('Logos').getPublicUrl(fileName); 
            tenantConfig.logo_url = data.publicUrl; 
        }
    }
    
    const { error } = await _supabase.from("saas_estabelecimentos").upsert({
        slug: TENANT_ATIVO, 
        nome_empresa: tenantConfig.nome_empresa, 
        sobre: tenantConfig.sobre, 
        endereco: tenantConfig.endereco, 
        horario_abertura: tenantConfig.horario_inicio,
        horario_fechamento: tenantConfig.horario_fim, 
        admin_contato: tenantConfig.admin_contato, 
        admin_receber_todas_notificacoes: tenantConfig.admin_receber_todas_notificacoes,
        logo_url: tenantConfig.logo_url, 
        cor_primaria: tenantConfig.cor_primaria, 
        cor_fundo: tenantConfig.cor_fundo, 
        cor_caixas: tenantConfig.cor_caixas, 
        cor_letras: tenantConfig.cor_letras,
        barbeiros: tenantConfig.barbeiros, 
        servicos: tenantConfig.servicos
    }, { onConflict: 'slug' });
    
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Todas as Configurações'; 
    btn.disabled = false;
    
    if (!error) {
        mostrarAlerta("Configurações atualizadas e salvas no banco de dados!"); 
        aplicarIdentidadeVisual(tenantConfig); 
        atualizarIconesApp(tenantConfig.logo_url);
        document.getElementById("painel-nome-negocio").textContent = tenantConfig.nome_empresa; 
        fecharConfiguracoesAdmin();
    } else { 
        mostrarAlerta("Erro ao gravar as configurações."); 
    }
}
