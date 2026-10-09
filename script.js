const SUPABASE_URL = "https://doecoosuqibzdsyadsyg.supabase.co";
const SUPABASE_KEY = "sb_publishable_-30z4xAhwJPYmy1bfSEjCw_loKUe8uL";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const urlParams = new URLSearchParams(window.location.search);
const TENANT_ATIVO = urlParams.get('slug') || "padrao";

let tenantConfig = { 
    nome_empresa: "Meu Estabelecimento", sobre: "", endereco: "", horario_inicio: "08:00", horario_fim: "19:00", logo_url: "", 
    cor_primaria: "#FF6600", cor_fundo: "#121212", cor_caixas: "#1A1A1A", cor_letras: "#FFFFFF",
    barbeiros: [], servicos: {}, senhas_usuarios: { "admin": "admin123" }
};

const PALETAS_CORES = [
    { nome: "Laranja Pro (Padrão)", primaria: "#FF6600", fundo: "#121212", caixas: "#1A1A1A" },
    { nome: "Azul Neon", primaria: "#00E5FF", fundo: "#0A0F1D", caixas: "#131B2E" },
    { nome: "Verde Esmeralda", primaria: "#00C853", fundo: "#121212", caixas: "#1A1A1A" },
    { nome: "Dourado Luxo", primaria: "#FFD700", fundo: "#0D0D0D", caixas: "#181818" },
    { nome: "Vermelho Carmim", primaria: "#FF1744", fundo: "#121212", caixas: "#1A1A1A" },
    { nome: "Roxo Cyber", primaria: "#9C27B0", fundo: "#120B18", caixas: "#1A1325" },
    { nome: "Rosa Choque", primaria: "#FF4081", fundo: "#121212", caixas: "#1A1A1A" },
    { nome: "Azul Royal", primaria: "#2979FF", fundo: "#0A1128", caixas: "#101D3E" },
    { nome: "Cinza Metálico", primaria: "#E0E0E0", fundo: "#121212", caixas: "#1E1E1E" },
    { nome: "Amarelo Sol", primaria: "#FFEA00", fundo: "#141412", caixas: "#1F1F1C" }
];

let usuarioLogado = ""; let offsetSemana = 0; let servicosSelecionados = {}; let barbeiroSelecionado = null; let paletaSelecionadaIdx = 0;
let modoMensalistaAtivo = false;

document.addEventListener("DOMContentLoaded", async () => {
    await carregarTenantConfig();
    aplicarIdentidadeVisual(tenantConfig);
    
    const logoUrls = ["tenant-logo", "painel-logo", "landing-logo"];
    logoUrls.forEach(id => {
        const el = document.getElementById(id);
        if (el && tenantConfig.logo_url) {
            el.src = tenantConfig.logo_url;
            el.style.display = "block";
        }
    });

    const nomeEl = document.getElementById("tenant-name") || document.getElementById("painel-nome-negocio");
    if (nomeEl) nomeEl.textContent = tenantConfig.nome_empresa || "Agenda Pro";

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

// CLIENTE (AGENDAR)
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

async function checkAvailableTimes() {
    const dateInput = document.getElementById("date").value; const timeSelect = document.getElementById("time");
    if (!dateInput || !timeSelect || !barbeiroSelecionado) return;
    
    let duracaoTotalServicos = 30;
    let tempTempo = 0;
    Object.values(servicosSelecionados).forEach(s => { tempTempo += s.duracao; });
    if(tempTempo > 0) duracaoTotalServicos = tempTempo;

    timeSelect.innerHTML = '<option value="">A calcular horários...</option>';
    const { data: ocupados } = await _supabase.from('saas_agendamentos').select('hora_inicio, duracao_total').eq('slug', TENANT_ATIVO).eq('barbeiro', barbeiroSelecionado).eq('data_agendamento', dateInput).neq('status', 'cancelado');
    
    let hInicio = parseInt(tenantConfig.horario_inicio.split(':')[0]) || 8;
    let hFim = parseInt(tenantConfig.horario_fim.split(':')[0]) || 19;

    timeSelect.innerHTML = '<option value="">Selecione um horário</option>';
    let temHorario = false;

    // BLOCOS DE 30 MINUTOS
    for (let h = hInicio; h < hFim; h++) {
        for (let m of ['00', '30']) {
            let timeStr = `${h.toString().padStart(2, '0')}:${m}`;
            let slotMinutos = h * 60 + parseInt(m);
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
    }
    if (!temHorario) timeSelect.innerHTML = '<option value="">Nenhum horário disponível</option>';
}

function abrirModalConfirmacao() {
    if (!barbeiroSelecionado) return alert("Selecione o profissional.");
    if (Object.keys(servicosSelecionados).length === 0) return alert("Selecione os serviços.");
    if (!document.getElementById("date").value || !document.getElementById("time").value) return alert("Escolha data e horário.");
    if (!document.getElementById("client-name").value || !document.getElementById("client-phone").value) return alert("Preencha os seus dados.");
    
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
    let total = 0; let duracao = 0; Object.values(servicosSelecionados).forEach(s => { total += s.preco; duracao += s.duracao; });
    const servs = Object.keys(servicosSelecionados).join(', ');

    const { error } = await _supabase.from('saas_agendamentos').insert({
        slug: TENANT_ATIVO, barbeiro: barbeiroSelecionado, cliente_nome: cliente, cliente_telefone: telefone,
        servicos: servs, data_agendamento: dataSQL, hora_inicio: horaStr, duracao_total: duracao || 30, valor_total: total, status: 'pendente'
    });

    if (error) { btn.disabled = false; return alert("Erro ao salvar."); }

    const profObj = (tenantConfig.barbeiros || []).find(b => (typeof b === 'object' ? b.nome : b) === barbeiroSelecionado);
    let numeroProf = (profObj && profObj.whatsapp) ? profObj.whatsapp : "";
    if (numeroProf) {
        const dataStr = dataSQL.split('-').reverse().join('/');
        const msg = `*NOVO AGENDAMENTO*\n*Cliente:* ${cliente}\n*Serviços:* ${servs} (${duracao || 30} min)\n*Data:* ${dataStr} às ${horaStr}\n*Total:* R$ ${total.toFixed(2)}\n\n✨ *AGENDAMENTO CONFIRMADO* ✨`;
        window.open(`https://api.whatsapp.com/send?phone=55${numeroProf.replace(/\D/g, "")}&text=${encodeURIComponent(msg)}`, '_blank');
    }

    fecharModalConfirmacao(); alert("Agendamento concluído!"); setTimeout(() => window.location.reload(), 2000);
}

// PAINEL (PAINEL.HTML) - LOGIN COM SEGURANÇA
function fazerLogin() {
    const user = document.getElementById("login-usuario").value.trim().toLowerCase();
    const pass = document.getElementById("login-senha").value.trim();
    if (!user || !pass) return alert("Preencha os campos de utilizador e palavra-passe.");
    
    let senhaAdmin = (tenantConfig.senhas_usuarios && tenantConfig.senhas_usuarios['admin']) ? tenantConfig.senhas_usuarios['admin'] : 'admin123';
    
    if (user === 'admin' && pass === senhaAdmin) {
        usuarioLogado = "Admin"; 
        document.getElementById("login-section").style.display = "none";
        document.getElementById("dashboard-barbeiro").style.display = "block";
        document.getElementById("admin-gear-container").innerHTML = '<div class="btn-engrenagem" onclick="abrirConfiguracoesAdmin()"><i class="fa-solid fa-gear"></i></div>';
        document.getElementById("label-resumo-financeiro").textContent = "Faturamento Geral (Admin)";
        
        const selectAdmin = document.getElementById("select-admin-prof");
        selectAdmin.innerHTML = "";
        (tenantConfig.barbeiros || []).forEach(p => {
            let nome = typeof p === 'object' ? p.nome : p;
            selectAdmin.innerHTML += `<option value="${nome}">${nome}</option>`;
        });
        document.getElementById("admin-seletor-prof-container").style.display = "flex";
        
        carregarAgendaBarbeiro();
    } else {
        const prof = (tenantConfig.barbeiros || []).find(b => (typeof b === 'object' ? b.nome : b).toLowerCase() === user);
        if (prof) {
            let nomeReal = typeof prof === 'object' ? prof.nome : prof;
            let senhaProf = (tenantConfig.senhas_usuarios && tenantConfig.senhas_usuarios[nomeReal]) ? tenantConfig.senhas_usuarios[nomeReal] : "123456";
            
            if (pass !== senhaProf) {
                return alert("Palavra-passe incorreta para este profissional.");
            }

            usuarioLogado = nomeReal; document.getElementById("login-section").style.display = "none";
            document.getElementById("dashboard-barbeiro").style.display = "block";
            document.getElementById("titulo-agenda-barbeiro").innerHTML = '<i class="fa-solid fa-calendar-check"></i> Agenda: ' + usuarioLogado;
            carregarAgendaBarbeiro(); return;
        }
        alert("Utilizador não encontrado.");
    }
}
function fazerLogout() { window.location.reload(); }
function mudarSemana(d) { offsetSemana += (d * 7); carregarAgendaBarbeiro(); }
function mudarProfissionalAdmin() { carregarAgendaBarbeiro(); }

async function carregarAgendaBarbeiro() {
    const container = document.getElementById("grade-semanal-container"); if (!container) return;
    container.innerHTML = "<p style='text-align:center; padding: 20px; color: #AAA;'>A sincronizar...</p>";
    
    let barbeiroFiltro = usuarioLogado === 'Admin' ? document.getElementById("select-admin-prof").value : usuarioLogado;
    if(!barbeiroFiltro && tenantConfig.barbeiros.length > 0) {
        barbeiroFiltro = typeof tenantConfig.barbeiros[0] === 'object' ? tenantConfig.barbeiros[0].nome : tenantConfig.barbeiros[0];
    }
    
    let hInicio = parseInt(tenantConfig.horario_inicio.split(':')[0]) || 8;
    let hFim = parseInt(tenantConfig.horario_fim.split(':')[0]) || 19;
    const datas = []; const hoje = new Date();
    for (let i=0; i<6; i++) {
        let d = new Date(hoje); d.setDate(hoje.getDate() + i + offsetSemana);
        datas.push(d.toISOString().split('T')[0]);
    }
    const { data: agendamentos } = await _supabase.from('saas_agendamentos').select('*').eq('slug', TENANT_ATIVO).eq('barbeiro', barbeiroFiltro).in('data_agendamento', datas);
    let html = "";
    
    // RENDERIZANDO GRELHA DE 30 EM 30 MINUTOS
    for (let i=0; i<6; i++) {
        let dataSQL = datas[i]; let dObj = new Date(dataSQL + 'T12:00:00');
        let diaStr = dObj.toLocaleDateString('pt-BR', {weekday: 'short', day: '2-digit', month: '2-digit'});
        html += `<div class="day-column"><div class="day-header">${diaStr}</div>`;
        for (let h = hInicio; h <= hFim; h++) {
            for (let m of ['00', '30']) {
                if (h === hFim && m === '30') continue; // Termina exatamente na hora de fecho
                let time = `${h.toString().padStart(2, '0')}:${m}`;
                let agList = agendamentos ? agendamentos.filter(a => a.data_agendamento === dataSQL && String(a.hora_inicio).substring(0,5) === time) : [];
                
                if (agList.length > 0) {
                    agList.forEach(ag => {
                        const isMensalista = ag.servicos && ag.servicos.includes("[MENSALISTA]");
                        if (ag.status === 'bloqueado') {
                            html += `<div class="slot-item blocked" onclick="desbloquearHorario('${ag.id}')">${time} - Bloq</div>`;
                        } else if (ag.status === 'concluido') {
                            html += `<div class="slot-item concluded">${time} - Fim</div>`;
                        } else {
                            // COR ROXA PARA MENSALISTAS
                            let classExtras = isMensalista ? "booked" : "booked";
                            let colorStyle = isMensalista ? "style='border-left-color:#9b59b6; background:rgba(155, 89, 182, 0.1); color:#FFF;'" : "";
                            html += `<div class="slot-item ${classExtras}" ${colorStyle} onclick='abrirModalGerenciarAtendimento(${JSON.stringify(ag)})'>${time} - ${ag.cliente_nome.split(' ')[0]}</div>`;
                        }
                    });
                } else { 
                    html += `<div class="slot-item available" onclick="bloquearHorario('${dataSQL}', '${time}')">${time} - Livre</div>`; 
                }
            }
        }
        html += `</div>`;
    }
    container.innerHTML = html; atualizarFinanceiroProfissional();
}

function abrirConfiguracoesAdmin() {
    document.getElementById("config-nome-empresa").value = tenantConfig.nome_empresa || "";
    document.getElementById("config-sobre").value = tenantConfig.sobre || "";
    document.getElementById("config-endereco").value = tenantConfig.endereco || "";
    document.getElementById("config-logo-url").value = tenantConfig.logo_url || "";
    document.getElementById("config-h-inicio").value = tenantConfig.horario_inicio || "08:00";
    document.getElementById("config-h-fim").value = tenantConfig.horario_fim || "19:00";
    renderizarPaletasConfig();
    renderizarListasConfigAdmin();
    mudarPassoConfig(1, document.querySelector('.tab-btn'));
    document.getElementById("modal-config-admin").style.display = "flex";
}
function fecharConfiguracoesAdmin() { document.getElementById("modal-config-admin").style.display = "none"; }

function mudarPassoConfig(passo, btn) {
    document.querySelectorAll('.config-step-content').forEach(el => el.classList.remove('active'));
    document.getElementById("step-config-" + passo).classList.add('active');
    if(btn) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
}

function renderizarPaletasConfig() {
    const container = document.getElementById("palettes-container"); container.innerHTML = "";
    PALETAS_CORES.forEach((p, idx) => {
        let isSel = (tenantConfig.cor_primaria === p.primaria) ? "selected" : "";
        container.innerHTML += `<div class="palette-card ${isSel}" style="background:${p.caixas}; border-left: 5px solid ${p.primaria};" onclick="selecionarPaleta(${idx})">
            <span>${p.nome}</span><div style="width:16px; height:16px; background:${p.primaria}; border-radius:50%;"></div></div>`;
    });
}
function selecionarPaleta(idx) {
    paletaSelecionadaIdx = idx;
    let p = PALETAS_CORES[idx];
    tenantConfig.cor_primaria = p.primaria;
    tenantConfig.cor_fundo = p.fundo;
    tenantConfig.cor_caixas = p.caixas;
    renderizarPaletasConfig();
    aplicarIdentidadeVisual(tenantConfig);
}

function renderizarListasConfigAdmin() {
    const listP = document.getElementById("lista-profissionais-config"); listP.innerHTML = "";
    (tenantConfig.barbeiros || []).forEach((p, i) => {
        let nome = typeof p === 'object' ? p.nome : p;
        let wpp = typeof p === 'object' && p.whatsapp ? p.whatsapp : '';
        let senhaExib = (tenantConfig.senhas_usuarios && tenantConfig.senhas_usuarios[nome]) ? tenantConfig.senhas_usuarios[nome] : '123456';
        
        listP.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:6px; margin-bottom:4px; font-size:0.8rem;">
            <div><strong>${nome}</strong> (${wpp})<br><span style="color:#AAA; font-size:0.7rem;">Senha: ${senhaExib}</span></div>
            <button type="button" onclick="removerProfissionalConfig(${i})" style="color:#e74c3c; background:none; border:none; padding:10px;"><i class="fa-solid fa-trash"></i></button></div>`;
    });

    const listS = document.getElementById("lista-servicos-config"); listS.innerHTML = "";
    Object.keys(tenantConfig.servicos || {}).forEach(nome => {
        let s = tenantConfig.servicos[nome];
        listS.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:6px 10px; border-radius:6px; margin-bottom:4px; font-size:0.8rem;">
            <span><strong>${nome}</strong> - R$ ${s.price} (${s.duration}m)</span><button type="button" onclick="removerServicoConfig('${nome}')" style="color:#e74c3c; background:none; border:none;"><i class="fa-solid fa-trash"></i></button></div>`;
    });
}

function adicionarProfissionalConfig() {
    let nome = document.getElementById("novo-prof-nome").value.trim();
    let wpp = document.getElementById("novo-prof-wpp").value.replace(/\D/g, "");
    let senha = document.getElementById("novo-prof-senha").value.trim() || "123456";
    
    if(nome && wpp) {
        if(!tenantConfig.barbeiros) tenantConfig.barbeiros = [];
        tenantConfig.barbeiros.push({ nome, whatsapp: wpp });
        
        if(!tenantConfig.senhas_usuarios) tenantConfig.senhas_usuarios = {};
        tenantConfig.senhas_usuarios[nome] = senha;
        
        document.getElementById("novo-prof-nome").value = "";
        document.getElementById("novo-prof-wpp").value = "";
        document.getElementById("novo-prof-senha").value = "";
        renderizarListasConfigAdmin();
    } else { alert("Preencha o nome e o telefone do profissional."); }
}
function removerProfissionalConfig(i) { 
    let nomeToRemove = typeof tenantConfig.barbeiros[i] === 'object' ? tenantConfig.barbeiros[i].nome : tenantConfig.barbeiros[i];
    tenantConfig.barbeiros.splice(i, 1); 
    if(tenantConfig.senhas_usuarios && tenantConfig.senhas_usuarios[nomeToRemove]) {
        delete tenantConfig.senhas_usuarios[nomeToRemove];
    }
    renderizarListasConfigAdmin(); 
}

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
    tenantConfig.sobre = document.getElementById("config-sobre").value.trim();
    tenantConfig.endereco = document.getElementById("config-endereco").value.trim();
    tenantConfig.logo_url = document.getElementById("config-logo-url").value.trim();
    tenantConfig.horario_inicio = document.getElementById("config-h-inicio").value;
    tenantConfig.horario_fim = document.getElementById("config-h-fim").value;

    const { error } = await _supabase.from("saas_estabelecimentos").upsert({
        slug: TENANT_ATIVO, nome_empresa: tenantConfig.nome_empresa, sobre: tenantConfig.sobre,
        endereco: tenantConfig.endereco, logo_url: tenantConfig.logo_url,
        horario_inicio: tenantConfig.horario_inicio, horario_fim: tenantConfig.horario_fim,
        barbeiros: tenantConfig.barbeiros, servicos: tenantConfig.servicos, senhas_usuarios: tenantConfig.senhas_usuarios,
        cor_primaria: tenantConfig.cor_primaria, cor_fundo: tenantConfig.cor_fundo, cor_caixas: tenantConfig.cor_caixas
    }, { onConflict: 'slug' });

    if(error) return alert("Erro ao salvar configurações.");
    fecharConfiguracoesAdmin();
    alert("Configurações salvas com sucesso!");
    window.location.reload();
}

let atendimentoAtual = null;
function abrirModalGerenciarAtendimento(ag) {
    atendimentoAtual = ag;
    const dataF = ag.data_agendamento.split('-').reverse().join('/');
    const box = document.getElementById("detalhes-atendimento-box");
    box.innerHTML = `<strong>Cliente:</strong> ${ag.cliente_nome}<br>
                     <strong>Telefone:</strong> ${ag.cliente_telefone || 'Não informado'}<br>
                     <strong>Serviço:</strong> ${ag.servicos || 'Padrão'} (${ag.duracao_total || 30} min)<br>
                     <strong>Valor:</strong> R$ ${(ag.valor_total || 0).toFixed(2)}<br>
                     <strong>Data/Hora:</strong> ${dataF} às ${String(ag.hora_inicio).substring(0,5)}`;
    
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
    const msg = `*Olá ${ag.cliente_nome}!* Lembramos do seu agendamento hoje (${dataF} às ${String(ag.hora_inicio).substring(0,5)}).`;
    let tel = ag.cliente_telefone ? ag.cliente_telefone.replace(/\D/g, "") : "31994951564";
    window.open(`https://api.whatsapp.com/send?phone=55${tel}&text=${encodeURIComponent(msg)}`, '_blank');
}

// RESTAURAÇÃO DO MÓDULO MENSALISTAS INTEGRADO AO MODAL DE NOVO AGENDAMENTO
function abrirModalMensalistas() { 
    modoMensalistaAtivo = true;
    document.getElementById("titulo-modal-novo-agendamento").textContent = "Cadastrar Mensalista";
    document.getElementById("bloco-recorrencia-mensalista").style.display = "block";
    document.getElementById("bloco-check-encaixe").style.display = "none";
    prepararFormularioNovoAgendamento();
    document.getElementById("modal-novo-agendamento").style.display = "flex"; 
}
function abrirModalNovoAgendamento() {
    modoMensalistaAtivo = false;
    document.getElementById("titulo-modal-novo-agendamento").textContent = "Novo Agendamento";
    document.getElementById("bloco-recorrencia-mensalista").style.display = "none";
    document.getElementById("bloco-check-encaixe").style.display = "flex";
    prepararFormularioNovoAgendamento();
    document.getElementById("modal-novo-agendamento").style.display = "flex";
}

function prepararFormularioNovoAgendamento() {
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
    const hoje = new Date();
    document.getElementById("novo-cli-data").value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
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
    const dataBase = document.getElementById("novo-cli-data").value;
    const hora = document.getElementById("novo-cli-hora").value;
    const isEncaixe = document.getElementById("check-encaixe").checked;

    if(!nome || !dataBase || !hora) return alert("Preencha Nome, Data e Horário.");

    let servsArray = []; let total = 0; let duracao = 0;
    document.querySelectorAll(".chk-servico-novo:checked").forEach(chk => {
        servsArray.push(chk.value);
        total += parseFloat(chk.dataset.preco);
        duracao += parseInt(chk.dataset.tempo);
    });
    let servicosStr = servsArray.length > 0 ? servsArray.join(', ') : "Atendimento Padrão";
    if(duracao === 0) duracao = 30;

    let barbeiroAtual = usuarioLogado === 'Admin' ? document.getElementById("select-admin-prof").value : usuarioLogado;
    let iteracoes = modoMensalistaAtivo ? (parseInt(document.getElementById("novo-cli-semanas").value) || 4) : 1;

    document.getElementById("btn-salvar-agendamento").textContent = "A Guardar...";
    document.getElementById("btn-salvar-agendamento").disabled = true;

    try {
        for (let i = 0; i < iteracoes; i++) {
            let d = new Date(dataBase + "T12:00:00");
            d.setDate(d.getDate() + (i * 7));
            let dataIso = d.toISOString().split('T')[0];

            let servicoFinal = servicosStr;
            if (modoMensalistaAtivo) servicoFinal = `[MENSALISTA] ${servicoFinal}`;
            else if (isEncaixe) servicoFinal = `[ENCAIXE] ${servicoFinal}`;

            const { error } = await _supabase.from('saas_agendamentos').insert({
                slug: TENANT_ATIVO, barbeiro: barbeiroAtual, cliente_nome: nome, cliente_telefone: tel,
                servicos: servicoFinal, data_agendamento: dataIso, hora_inicio: hora, duracao_total: duracao, valor_total: total, status: 'pendente'
            });
            if (error) throw error;
        }
        fecharModalNovoAgendamento(); 
        carregarAgendaBarbeiro(); 
        alert(modoMensalistaAtivo ? "Mensalista guardado para as próximas semanas!" : "Agendamento criado com sucesso!");
    } catch (e) {
        alert("Erro ao salvar.");
    } finally {
        document.getElementById("btn-salvar-agendamento").textContent = "Salvar";
        document.getElementById("btn-salvar-agendamento").disabled = false;
    }
}

function bloquearHorario(data, hora) {
    let barbeiroAtual = usuarioLogado === 'Admin' ? document.getElementById("select-admin-prof").value : usuarioLogado;
    if(confirm(`Bloquear agenda no dia ${data.split('-').reverse().join('/')} às ${hora}?`)) {
        _supabase.from('saas_agendamentos').insert({ slug: TENANT_ATIVO, barbeiro: barbeiroAtual, data_agendamento: data, hora_inicio: hora, status: 'bloqueado', duracao_total: 30 }).then(() => carregarAgendaBarbeiro());
    }
}
function desbloquearHorario(id) {
    if(confirm("Libertar este horário?")) {
        _supabase.from('saas_agendamentos').delete().eq('id', id).then(() => carregarAgendaBarbeiro());
    }
}

async function atualizarFinanceiroProfissional() {
    let barbeiroFiltro = usuarioLogado === 'Admin' ? document.getElementById("select-admin-prof").value : usuarioLogado;
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
