const SUPABASE_URL = "https://doecoosuqibzdsyadsyg.supabase.co";
const SUPABASE_KEY = "sb_publishable_-30z4xAhwJPYmy1bfSEjCw_loKUe8uL";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const urlParams = new URLSearchParams(window.location.search);
const TENANT_ATIVO = urlParams.get('slug') || "padrao";

let tenantConfig = { 
    nome_empresa: "Meu Estabelecimento", admin_contato: "", admin_receber_todas_notificacoes: false,
    sobre: "", endereco: "", horario_inicio: "08:00", horario_fim: "19:00", logo_url: "", 
    cor_primaria: "#FF6600", cor_fundo: "#121212", cor_caixas: "#1A1A1A", cor_letras: "#FFFFFF",
    barbeiros: [], servicos: {}, senhas_usuarios: { "admin": "admin123" }
};

let usuarioLogado = ""; let offsetSemana = 0; let servicosSelecionados = {}; let barbeiroSelecionado = null;

document.addEventListener("DOMContentLoaded", async () => {
    await carregarTenantConfig();
    aplicarIdentidadeVisual(tenantConfig);
    
    // Carregamento da logo
    const logoUrls = ["tenant-logo", "painel-logo", "landing-logo"];
    logoUrls.forEach(id => {
        const el = document.getElementById(id);
        if (el && tenantConfig.logo_url) {
            el.src = tenantConfig.logo_url;
            el.style.display = "block";
        }
    });

    if (document.getElementById("agendar-container")) carregarDadosAgendamentoCliente();
});

async function carregarTenantConfig() {
    try {
        const { data } = await _supabase.from("saas_estabelecimentos").select("*").eq("slug", TENANT_ATIVO).single();
        if (data) {
            Object.assign(tenantConfig, data);
            if (!tenantConfig.barbeiros) tenantConfig.barbeiros = [];
            if (!tenantConfig.servicos) tenantConfig.servicos = {};
            if (!tenantConfig.senhas_usuarios) tenantConfig.senhas_usuarios = { "admin": "admin123" };
        }
    } catch (e) {}
}

function aplicarIdentidadeVisual(config) {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', config.cor_primaria || '#FF6600');
    root.style.setProperty('--bg-color', config.cor_fundo || '#121212');
    root.style.setProperty('--box-color', config.cor_caixas || '#1A1A1A');
    root.style.setProperty('--text-color', config.cor_letras || '#FFFFFF');
}

function mostrarAlerta(texto) { alert(texto); }

// ==========================================
// CLIENTE (AGENDAR.HTML)
// ==========================================
function carregarDadosAgendamentoCliente() { renderizarBarbeiros(); renderizarServicos(); }
function renderizarBarbeiros() {
    const grid = document.getElementById("barbers-grid"); if (!grid) return; grid.innerHTML = "";
    (tenantConfig.barbeiros || []).forEach((b) => {
        let nome = typeof b === 'object' ? b.nome : b;
        grid.innerHTML += `<div class="barber-card" onclick="selecionarBarbeiro('${nome}', this)"><i class="fa-solid fa-user" style="font-size: 2rem; color: var(--primary-color); margin-bottom: 10px;"></i><h3 style="font-size: 0.9rem;">${nome}</h3></div>`;
    });
}
function selecionarBarbeiro(nome, el) {
    barbeiroSelecionado = nome;
    document.querySelectorAll('.barber-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active'); checkAvailableTimes();
}
function renderizarServicos() {
    const grid = document.getElementById("services-grid"); if (!grid) return; grid.innerHTML = "";
    Object.keys(tenantConfig.servicos || {}).forEach(nome => {
        const s = tenantConfig.servicos[nome];
        grid.innerHTML += `<div class="service-card" onclick="toggleServico('${nome}', ${s.price}, ${s.duration}, this)">
            <div class="service-info"><h3>${nome}</h3><span>${s.duration} min</span></div>
            <div class="price">R$ ${s.price.toFixed(2)}</div></div>`;
    });
}
function toggleServico(nome, preco, duracao, el) {
    if (servicosSelecionados[nome]) { delete servicosSelecionados[nome]; el.classList.remove('active'); }
    else { servicosSelecionados[nome] = { preco, duracao }; el.classList.add('active'); }
    atualizarResumo();
}
function atualizarResumo() {
    const resumoBox = document.getElementById("resumo-flutuante"); if (!resumoBox) return;
    let total = 0; let tempo = 0; let qtd = 0;
    Object.values(servicosSelecionados).forEach(s => { total += s.preco; tempo += s.duracao; qtd++; });
    if (qtd > 0) {
        resumoBox.style.display = "flex"; document.getElementById("resumo-qtd-servicos").textContent = `${qtd} serviço(s)`;
        document.getElementById("resumo-valor-total").textContent = `R$ ${total.toFixed(2)}`; document.getElementById("resumo-duracao").textContent = `${tempo} min`;
    } else { resumoBox.style.display = "none"; }
    checkAvailableTimes();
}

// CONSUMO DE TEMPO NA AGENDA
async function checkAvailableTimes() {
    const dateInput = document.getElementById("date").value; const timeSelect = document.getElementById("time");
    if (!dateInput || !timeSelect || !barbeiroSelecionado) return;
    
    let duracaoTotalServicos = 30;
    let tempTempo = 0;
    Object.values(servicosSelecionados).forEach(s => { tempTempo += s.duracao; });
    if(tempTempo > 0) duracaoTotalServicos = tempTempo;

    timeSelect.innerHTML = '<option value="">A calcular horários...</option>';
    const { data: ocupados } = await _supabase.from('saas_agendamentos').select('hora_inicio, duracao_total').eq('slug', TENANT_ATIVO).eq('barbeiro', barbeiroSelecionado).eq('data_agendamento', dateInput).neq('status', 'cancelado');
    
    const profObj = (tenantConfig.barbeiros || []).find(b => (typeof b === 'object' ? b.nome : b) === barbeiroSelecionado);
    let hInicio = (profObj && profObj.inicio) ? parseInt(profObj.inicio.split(':')[0]) : parseInt(tenantConfig.horario_inicio.split(':')[0]);
    let hFim = (profObj && profObj.fim) ? parseInt(profObj.fim.split(':')[0]) : parseInt(tenantConfig.horario_fim.split(':')[0]);

    timeSelect.innerHTML = '<option value="">Selecione um horário</option>';
    let temHorario = false;

    for (let h = hInicio; h < hFim; h++) {
        let timeStr = `${h.toString().padStart(2, '0')}:00`;
        let slotMinutos = h * 60;
        let slotFimMinutos = slotMinutos + duracaoTotalServicos;
        let conflito = false;

        if(ocupados) {
            ocupados.forEach(ag => {
                let [ah, am] = ag.hora_inicio.split(':').map(Number);
                let agInicioMin = ah * 60 + am;
                let agFimMin = agInicioMin + (ag.duracao_total || 30);
                if (slotMinutos < agFimMin && slotFimMinutos > agInicioMin) conflito = true;
            });
        }

        if (!conflito) {
            timeSelect.innerHTML += `<option value="${timeStr}">${timeStr} (${duracaoTotalServicos} min)</option>`;
            temHorario = true;
        }
    }
    if (!temHorario) timeSelect.innerHTML = '<option value="">Nenhum horário disponível</option>';
}

function abrirModalConfirmacao() {
    if (!barbeiroSelecionado) return mostrarAlerta("Selecione o profissional.");
    if (Object.keys(servicosSelecionados).length === 0) return mostrarAlerta("Selecione os serviços.");
    if (!document.getElementById("date").value || !document.getElementById("time").value) return mostrarAlerta("Escolha data e horário.");
    if (!document.getElementById("client-name").value || !document.getElementById("client-phone").value) return mostrarAlerta("Preencha os seus dados.");
    
    let servicosStr = Object.keys(servicosSelecionados).join(', ');
    let total = 0; let duracao = 0;
    Object.values(servicosSelecionados).forEach(s => { total += s.preco; duracao += s.duracao; });

    document.getElementById("resumo-agendamento").innerHTML = `<strong>Profissional:</strong> ${barbeiroSelecionado}<br><strong>Serviços:</strong> ${servicosStr} (${duracao} min)<br><strong>Data:</strong> ${document.getElementById("date").value.split('-').reverse().join('/')} às ${document.getElementById("time").value}<br><strong>Valor:</strong> R$ ${total.toFixed(2)}`;
    document.getElementById("modal-confirmacao").style.display = "flex";
}
function fecharModalConfirmacao() { document.getElementById("modal-confirmacao").style.display = "none"; }

async function confirmarEEnviar() {
    const btn = document.getElementById("btn-confirmar-agendamento"); btn.disabled = true;
    const cliente = document.getElementById("client-name").value; const telefone = document.getElementById("client-phone").value.replace(/\D/g, "");
    const dataSQL = document.getElementById("date").value; const horaStr = document.getElementById("time").value;
    let total = 0; let duracao = 0; Object.values(servicosSelecionados).forEach(s => { total += s.preco; tempo += s.duracao; });
    const servs = Object.keys(servicosSelecionados).join(', ');

    const { error } = await _supabase.from('saas_agendamentos').insert({
        slug: TENANT_ATIVO, barbeiro: barbeiroSelecionado, cliente_nome: cliente, cliente_telefone: telefone,
        servicos: servs, data_agendamento: dataSQL, hora_inicio: horaStr, duracao_total: duracao || 30, valor_total: total, status: 'pendente'
    });

    if (error) { btn.disabled = false; return mostrarAlerta("Erro ao salvar."); }

    const profObj = (tenantConfig.barbeiros || []).find(b => (typeof b === 'object' ? b.nome : b) === barbeiroSelecionado);
    let numeroProf = (profObj && profObj.whatsapp) ? profObj.whatsapp : tenantConfig.admin_contato;
    if (numeroProf) {
        const dataStr = dataSQL.split('-').reverse().join('/');
        const msg = `*NOVO AGENDAMENTO*\n*Cliente:* ${cliente}\n*Serviços:* ${servs} (${duracao || 30} min)\n*Data:* ${dataStr} às ${horaStr}\n*Total:* R$ ${total.toFixed(2)}\n\n✨ *AGENDAMENTO CONFIRMADO* ✨`;
        window.open(`https://api.whatsapp.com/send?phone=55${numeroProf.replace(/\D/g, "")}&text=${encodeURIComponent(msg)}`, '_blank');
    }

    fecharModalConfirmacao(); mostrarAlerta("Agendamento concluído!"); setTimeout(() => window.location.reload(), 2000);
}

// ==========================================
// PAINEL (PAINEL.HTML)
// ==========================================
function fazerLogin() {
    const user = document.getElementById("login-usuario").value.trim().toLowerCase();
    const pass = document.getElementById("login-senha").value.trim();
    if (!user || !pass) return mostrarAlerta("Preencha os campos.");
    let senhaAdmin = (tenantConfig.senhas_usuarios && tenantConfig.senhas_usuarios['admin']) ? tenantConfig.senhas_usuarios['admin'] : 'admin123';
    
    if (user === 'admin' && pass === senhaAdmin) {
        usuarioLogado = "Admin"; 
        document.getElementById("login-section").style.display = "none";
        document.getElementById("dashboard-barbeiro").style.display = "block";
        document.getElementById("admin-gear-container").innerHTML = '<div class="btn-engrenagem" onclick="abrirConfiguracoesAdmin()"><i class="fa-solid fa-gear"></i></div>';
        document.getElementById("label-resumo-financeiro").textContent = "Faturamento Geral (Admin)";
        carregarAgendaBarbeiro();
    } else {
        const prof = (tenantConfig.barbeiros || []).find(b => (typeof b === 'object' ? b.nome : b).toLowerCase() === user);
        if (prof) {
            let nomeReal = typeof prof === 'object' ? prof.nome : prof;
            usuarioLogado = nomeReal; document.getElementById("login-section").style.display = "none";
            document.getElementById("dashboard-barbeiro").style.display = "block";
            document.getElementById("titulo-agenda-barbeiro").innerHTML = '<i class="fa-solid fa-calendar-check"></i> Agenda: ' + usuarioLogado;
            carregarAgendaBarbeiro(); return;
        }
        mostrarAlerta("Utilizador ou palavra-passe incorreta.");
    }
}
function fazerLogout() { window.location.reload(); }
function mudarSemana(d) { offsetSemana += (d * 7); carregarAgendaBarbeiro(); }

async function carregarAgendaBarbeiro() {
    const container = document.getElementById("grade-semanal-container"); if (!container) return;
    container.innerHTML = "<p style='text-align:center; padding: 20px; color: #AAA;'>A sincronizar...</p>";
    
    let barbeiroFiltro = usuarioLogado === 'Admin' ? ((tenantConfig.barbeiros[0]) ? (typeof tenantConfig.barbeiros[0] === 'object' ? tenantConfig.barbeiros[0].nome : tenantConfig.barbeiros[0]) : 'jonathan') : usuarioLogado;
    
    let hInicio = parseInt(tenantConfig.horario_inicio.split(':')[0]) || 8;
    let hFim = parseInt(tenantConfig.horario_fim.split(':')[0]) || 19;
    const datas = []; const hoje = new Date();
    for (let i=0; i<6; i++) {
        let d = new Date(hoje); d.setDate(hoje.getDate() + i + offsetSemana);
        datas.push(d.toISOString().split('T')[0]);
    }
    const { data: agendamentos } = await _supabase.from('saas_agendamentos').select('*').eq('slug', TENANT_ATIVO).eq('barbeiro', barbeiroFiltro).in('data_agendamento', datas);
    let html = "";
    for (let i=0; i<6; i++) {
        let dataSQL = datas[i]; let dObj = new Date(dataSQL + 'T12:00:00');
        let diaStr = dObj.toLocaleDateString('pt-BR', {weekday: 'short', day: '2-digit', month: '2-digit'});
        html += `<div class="day-column"><div class="day-header">${diaStr}</div>`;
        for (let h = hInicio; h <= hFim; h++) {
            let time = `${h.toString().padStart(2, '0')}:00`;
            let agList = agendamentos ? agendamentos.filter(a => a.data_agendamento === dataSQL && a.hora_inicio === time) : [];
            if (agList.length > 0) {
                agList.forEach(ag => {
                    if (ag.status === 'bloqueado') html += `<div class="slot-item blocked" onclick="desbloquearHorario('${ag.id}')">${time} - Bloq</div>`;
                    else if (ag.status === 'concluido') html += `<div class="slot-item concluded">${time} - Fim</div>`;
                    else html += `<div class="slot-item booked" onclick='abrirModalGerenciarAtendimento(${JSON.stringify(ag)})'>${time} - ${ag.cliente_nome.split(' ')[0]}</div>`;
                });
            } else { html += `<div class="slot-item available" onclick="bloquearHorario('${dataSQL}', '${time}')">${time} - Livre</div>`; }
        }
        html += `</div>`;
    }
    container.innerHTML = html; atualizarFinanceiroProfissional();
}

// CONFIGURAÇÕES DO ADMIN (ENGRENAGEM)
function abrirConfiguracoesAdmin() {
    document.getElementById("config-nome-empresa").value = tenantConfig.nome_empresa || "";
    document.getElementById("config-logo-url").value = tenantConfig.logo_url || "";
    document.getElementById("config-admin-wpp").value = tenantConfig.admin_contato || "";
    document.getElementById("config-h-inicio").value = tenantConfig.horario_inicio || "08:00";
    document.getElementById("config-h-fim").value = tenantConfig.horario_fim || "19:00";
    renderizarListasConfigAdmin();
    document.getElementById("modal-config-admin").style.display = "flex";
}
function fecharConfiguracoesAdmin() { document.getElementById("modal-config-admin").style.display = "none"; }

function renderizarListasConfigAdmin() {
    const listP = document.getElementById("lista-profissionais-config"); listP.innerHTML = "";
    (tenantConfig.barbeiros || []).forEach((p, i) => {
        let nome = typeof p === 'object' ? p.nome : p;
        let wpp = typeof p === 'object' && p.whatsapp ? p.whatsapp : '';
        listP.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:6px 10px; border-radius:6px; margin-bottom:4px; font-size:0.8rem;">
            <span>${nome} (${wpp})</span><button type="button" onclick="removerProfissionalConfig(${i})" style="color:#e74c3c; background:none; border:none;"><i class="fa-solid fa-trash"></i></button></div>`;
    });

    const listS = document.getElementById("lista-servicos-config"); listS.innerHTML = "";
    Object.keys(tenantConfig.servicos || {}).forEach(nome => {
        let s = tenantConfig.servicos[nome];
        listS.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:6px 10px; border-radius:6px; margin-bottom:4px; font-size:0.8rem;">
            <span>${nome} - R$ ${s.price} (${s.duration}m)</span><button type="button" onclick="removerServicoConfig('${nome}')" style="color:#e74c3c; background:none; border:none;"><i class="fa-solid fa-trash"></i></button></div>`;
    });
}

function adicionarProfissionalConfig() {
    let nome = document.getElementById("novo-prof-nome").value.trim();
    let wpp = document.getElementById("novo-prof-wpp").value.replace(/\D/g, "");
    if(nome) {
        if(!tenantConfig.barbeiros) tenantConfig.barbeiros = [];
        tenantConfig.barbeiros.push({ nome, whatsapp: wpp });
        document.getElementById("novo-prof-nome").value = "";
        document.getElementById("novo-prof-wpp").value = "";
        renderizarListasConfigAdmin();
    }
}
function removerProfissionalConfig(i) { tenantConfig.barbeiros.splice(i, 1); renderizarListasConfigAdmin(); }

function adicionarServicoConfig() {
    let nome = document.getElementById("novo-serv-nome").value.trim();
    let preco = parseFloat(document.getElementById("novo-serv-preco").value);
    let tempo = parseInt(document.getElementById("novo-serv-tempo").value);
    if(nome && preco && tempo) {
        if(!tenantConfig.servicos) tenantConfig.servicos = {};
        tenantConfig.servicos[nome] = { price: preco, duration: tempo };
        document.getElementById("novo-serv-nome").value = "";
        document.getElementById("novo-serv-preco").value = "";
        document.getElementById("novo-serv-tempo").value = "";
        renderizarListasConfigAdmin();
    }
}
function removerServicoConfig(nome) { delete tenantConfig.servicos[nome]; renderizarListasConfigAdmin(); }

async function salvarConfiguracoesAdmin() {
    tenantConfig.nome_empresa = document.getElementById("config-nome-empresa").value.trim();
    tenantConfig.logo_url = document.getElementById("config-logo-url").value.trim();
    tenantConfig.admin_contato = document.getElementById("config-admin-wpp").value.replace(/\D/g, "");
    tenantConfig.horario_inicio = document.getElementById("config-h-inicio").value;
    tenantConfig.horario_fim = document.getElementById("config-h-fim").value;

    const { error } = await _supabase.from("saas_estabelecimentos").upsert({
        slug: TENANT_ATIVO, nome_empresa: tenantConfig.nome_empresa, logo_url: tenantConfig.logo_url,
        admin_contato: tenantConfig.admin_contato, horario_inicio: tenantConfig.horario_inicio,
        horario_fim: tenantConfig.horario_fim, barbeiros: tenantConfig.barbeiros, servicos: tenantConfig.servicos
    }, { onConflict: 'slug' });

    if(error) return alert("Erro ao salvar configurações.");
    fecharConfiguracoesAdmin();
    alert("Configurações salvas com sucesso!");
    window.location.reload();
}

// GERENCIAR ATENDIMENTO (MODAL)
let atendimentoAtual = null;
function abrirModalGerenciarAtendimento(ag) {
    atendimentoAtual = ag;
    const dataF = ag.data_agendamento.split('-').reverse().join('/');
    const box = document.getElementById("detalhes-atendimento-box");
    box.innerHTML = `<strong>Cliente:</strong> ${ag.cliente_nome}<br>
                     <strong>Telefone:</strong> ${ag.cliente_telefone || 'Não informado'}<br>
                     <strong>Serviço:</strong> ${ag.servicos || 'Padrão'} (${ag.duracao_total || 30} min)<br>
                     <strong>Valor:</strong> R$ ${(ag.valor_total || 0).toFixed(2)}<br>
                     <strong>Data/Hora:</strong> ${dataF} às ${ag.hora_inicio}`;
    
    document.getElementById("box-forma-pagamento").style.display = "none";
    document.getElementById("box-reagendar").style.display = "none";
    document.getElementById("botoes-gerenciar-box").style.display = "flex";

    document.getElementById("btn-modal-concluir").onclick = () => {
        document.getElementById("box-forma-pagamento").style.display = "block";
        document.getElementById("botoes-gerenciar-box").style.display = "none";
    };
    document.getElementById("btn-modal-reagendar").onclick = () => {
        document.getElementById("box-reagendar").style.display = "block";
        document.getElementById("botoes-gerenciar-box").style.display = "none";
    };
    document.getElementById("btn-modal-cancelar").onclick = () => abrirModalCancelamentoEstilizado(ag.id);
    document.getElementById("btn-modal-lembrete").onclick = () => enviarLembreteWhatsApp(ag);

    document.getElementById("modal-gerenciar-atendimento").style.display = "flex";
}
function fecharModalGerenciar() { document.getElementById("modal-gerenciar-atendimento").style.display = "none"; }

async function confirmarConclusaoComPgto() {
    const formaPgto = document.getElementById("select-forma-pgto").value;
    await _supabase.from('saas_agendamentos').update({ status: 'concluido', forma_pagamento: formaPgto }).eq('id', atendimentoAtual.id);
    fecharModalGerenciar(); carregarAgendaBarbeiro();
}

async function salvarReagendamento() {
    const novaData = document.getElementById("reagendar-data").value;
    const novaHora = document.getElementById("reagendar-hora").value;
    if(!novaData || !novaHora) return alert("Selecione data e hora.");

    const { error } = await _supabase.from('saas_agendamentos').update({ data_agendamento: novaData, hora_inicio: novaHora }).eq('id', atendimentoAtual.id);
    if(error) return alert("Erro ao reagendar.");
    fecharModalGerenciar(); carregarAgendaBarbeiro(); alert("Reagendado com sucesso!");
}

let idParaCancelar = null;
function abrirModalCancelamentoEstilizado(id) {
    idParaCancelar = id;
    document.getElementById("modal-confirmar-cancelamento").style.display = "flex";
    document.getElementById("btn-confirma-cancelamento-sim").onclick = async () => {
        await _supabase.from('saas_agendamentos').delete().eq('id', idParaCancelar);
        fecharModalCancelamentoEstilizado();
        fecharModalGerenciar();
        carregarAgendaBarbeiro();
    };
}
function fecharModalCancelamentoEstilizado() {
    document.getElementById("modal-confirmar-cancelamento").style.display = "none";
    idParaCancelar = null;
}

function enviarLembreteWhatsApp(ag) {
    const dataF = ag.data_agendamento.split('-').reverse().join('/');
    const msg = `*Olá ${ag.cliente_nome}!* Lembramos do seu agendamento hoje (${dataF} às ${ag.hora_inicio}).`;
    let tel = ag.cliente_telefone ? ag.cliente_telefone.replace(/\D/g, "") : "31994951564";
    window.open(`https://api.whatsapp.com/send?phone=55${tel}&text=${encodeURIComponent(msg)}`, '_blank');
}

// NOVO AGENDAMENTO PELO PAINEL
function abrirModalMensalistas() { document.getElementById("modal-mensalistas").style.display = "flex"; }
function abrirModalNovoAgendamento() {
    const container = document.getElementById("lista-servicos-checkboxes"); container.innerHTML = "";
    Object.keys(tenantConfig.servicos || {}).forEach(nome => {
        const s = tenantConfig.servicos[nome];
        container.innerHTML += `<div class="service-check-card" onclick="toggleCardServico(this)">
            <div style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" class="chk-servico-novo" value="${nome}" data-preco="${s.price}" data-tempo="${s.duration}" onchange="calcularTotalNovoServico()" style="width:18px; height:18px;">
                <span style="font-size:0.85rem; font-weight:600;">${nome} (${s.duration} min)</span>
            </div>
            <strong style="color:var(--primary-color); font-size:0.85rem;">R$ ${s.price.toFixed(2)}</strong>
        </div>`;
    });
    document.getElementById("novo-cli-nome").value = "";
    document.getElementById("novo-cli-tel").value = "";
    document.getElementById("check-encaixe").checked = false;
    document.getElementById("modal-novo-agendamento").style.display = "flex";
}
function toggleCardServico(card) {
    const chk = card.querySelector('input[type="checkbox"]');
    chk.checked = !chk.checked;
    if(chk.checked) card.classList.add('selected'); else card.classList.remove('selected');
    calcularTotalNovoServico();
}
function fecharModalNovoAgendamento() { document.getElementById("modal-novo-agendamento").style.display = "none"; }

function calcularTotalNovoServico() {
    let total = 0;
    document.querySelectorAll(".chk-servico-novo:checked").forEach(chk => { total += parseFloat(chk.dataset.preco); });
    document.getElementById("novo-cli-total").textContent = `R$ ${total.toFixed(2)}`;
}

async function salvarNovoAgendamentoBarbeiro() {
    const nome = document.getElementById("novo-cli-nome").value.trim();
    const tel = document.getElementById("novo-cli-tel").value.replace(/\D/g, "");
    const data = document.getElementById("novo-cli-data").value;
    const hora = document.getElementById("novo-cli-hora").value;
    const isEncaixe = document.getElementById("check-encaixe").checked;

    if(!nome || !data || !hora) return alert("Preencha os campos obrigatórios.");

    let servsArray = []; let total = 0; let duracao = 0;
    document.querySelectorAll(".chk-servico-novo:checked").forEach(chk => {
        servsArray.push(chk.value);
        total += parseFloat(chk.dataset.preco);
        duracao += parseInt(chk.dataset.tempo);
    });
    let servicosStr = servsArray.length > 0 ? servsArray.join(', ') : "Atendimento Avulso";
    if(duracao === 0) duracao = 30;

    let barbeiroAtual = usuarioLogado === 'Admin' ? ((tenantConfig.barbeiros[0]) ? (typeof tenantConfig.barbeiros[0] === 'object' ? tenantConfig.barbeiros[0].nome : tenantConfig.barbeiros[0]) : 'jonathan') : usuarioLogado;

    const { error } = await _supabase.from('saas_agendamentos').insert({
        slug: TENANT_ATIVO, barbeiro: barbeiroAtual, cliente_nome: nome, cliente_telefone: tel,
        servicos: servicosStr, data_agendamento: data, hora_inicio: hora, duracao_total: duracao, valor_total: total, status: 'pendente'
    });

    if(error) return alert("Erro ao salvar agendamento.");
    fecharModalNovoAgendamento(); carregarAgendaBarbeiro(); alert("Agendamento criado com sucesso!");
}

function bloquearHorario(data, hora) {
    let barbeiroAtual = usuarioLogado === 'Admin' ? ((tenantConfig.barbeiros[0]) ? (typeof tenantConfig.barbeiros[0] === 'object' ? tenantConfig.barbeiros[0].nome : tenantConfig.barbeiros[0]) : 'jonathan') : usuarioLogado;
    if(confirm(`Bloquear agenda no dia ${data.split('-').reverse().join('/')} às ${hora}?`)) {
        _supabase.from('saas_agendamentos').insert({ slug: TENANT_ATIVO, barbeiro: barbeiroAtual, data_agendamento: data, hora_inicio: hora, status: 'bloqueado', duracao_total: 30 }).then(() => carregarAgendaBarbeiro());
    }
}
function desbloquearHorario(id) {
    if(confirm("Libertar este horário?")) {
        _supabase.from('saas_agendamentos').delete().eq('id', id).then(() => carregarAgendaBarbeiro());
    }
}

// FINANCEIRO
async function atualizarFinanceiroProfissional() {
    let barbeiroFiltro = usuarioLogado === 'Admin' ? null : usuarioLogado;
    const filtro = document.getElementById('filtro-financeiro-prof').value;
    
    let query = _supabase.from('saas_agendamentos').select('*').eq('slug', TENANT_ATIVO).eq('status', 'concluido');
    if(barbeiroFiltro) query = query.eq('barbeiro', barbeiroFiltro);

    const { data: ags } = await query;
    
    const hoje = new Date(); let total = 0; let listaPgtoHtml = "";
    (ags || []).forEach(ag => {
        const dAg = new Date(ag.data_agendamento + 'T12:00:00'); let contar = false;
        if (filtro === 'dia' && dAg.toDateString() === hoje.toDateString()) contar = true;
        if (filtro === 'mes' && dAg.getMonth() === hoje.getMonth() && dAg.getFullYear() === hoje.getFullYear()) contar = true;
        if (filtro === 'semana') {
            const inicio = new Date(hoje); inicio.setDate(hoje.getDate() - hoje.getDay());
            const fim = new Date(inicio); fim.setDate(inicio.getDate() + 6);
            if (dAg >= inicio && dAg <= fim) contar = true;
        }
        if (contar) {
            total += Number(ag.valor_total || 0);
            listaPgtoHtml += `• ${ag.cliente_nome} (${ag.barbeiro}): R$ ${(ag.valor_total||0).toFixed(2)} [${ag.forma_pagamento || 'Dinheiro'}]<br>`;
        }
    });

    document.getElementById('valor-financeiro-prof').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    document.getElementById('detalhes-pagamentos-individuais').innerHTML = listaPgtoHtml || "Nenhum pagamento registrado no período.";
}
