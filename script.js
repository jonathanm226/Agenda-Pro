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
    if (document.getElementById("painel-container")) {
        const logo = document.getElementById("painel-logo");
        if (logo && tenantConfig.logo_url) { logo.src = tenantConfig.logo_url; logo.style.display = "block"; }
        const nomeElement = document.getElementById("painel-nome-negocio");
        if (nomeElement) nomeElement.textContent = tenantConfig.nome_empresa;
    }
    if (document.getElementById("agendar-container")) {
        const logo = document.getElementById("tenant-logo");
        if (logo && tenantConfig.logo_url) { logo.src = logo.style.display = "block"; }
        carregarDadosAgendamentoCliente();
    }
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

// CLIENTE
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
}
async function checkAvailableTimes() {
    const dateInput = document.getElementById("date").value; const timeSelect = document.getElementById("time");
    if (!dateInput || !timeSelect || !barbeiroSelecionado) return;
    timeSelect.innerHTML = '<option value="">A carregar...</option>';
    const { data: ocupados } = await _supabase.from('saas_agendamentos').select('hora_inicio').eq('slug', TENANT_ATIVO).eq('barbeiro', barbeiroSelecionado).eq('data_agendamento', dateInput);
    const horariosOcupados = (ocupados || []).map(o => o.hora_inicio);
    const profObj = (tenantConfig.barbeiros || []).find(b => (typeof b === 'object' ? b.nome : b) === barbeiroSelecionado);
    let hInicio = (profObj && profObj.inicio) ? parseInt(profObj.inicio.split(':')[0]) : parseInt(tenantConfig.horario_inicio.split(':')[0]);
    let hFim = (profObj && profObj.fim) ? parseInt(profObj.fim.split(':')[0]) : parseInt(tenantConfig.horario_fim.split(':')[0]);
    timeSelect.innerHTML = '<option value="">Selecione</option>';
    for (let h = hInicio; h <= hFim; h++) {
        let timeStr = `${h.toString().padStart(2, '0')}:00`;
        if (!horariosOcupados.includes(timeStr)) timeSelect.innerHTML += `<option value="${timeStr}">${timeStr}</option>`;
    }
}
function abrirModalConfirmacao() {
    if (!barbeiroSelecionado) return mostrarAlerta("Selecione o profissional.");
    if (Object.keys(servicosSelecionados).length === 0) return mostrarAlerta("Selecione os serviços.");
    if (!document.getElementById("date").value || !document.getElementById("time").value) return mostrarAlerta("Escolha data e horário.");
    if (!document.getElementById("client-name").value || !document.getElementById("client-phone").value) return mostrarAlerta("Preencha os seus dados.");
    let servicosStr = Object.keys(servicosSelecionados).join(', ');
    document.getElementById("resumo-agendamento").innerHTML = `<strong>Profissional:</strong> ${barbeiroSelecionado}<br><strong>Serviços:</strong> ${servicosStr}<br><strong>Data:</strong> ${document.getElementById("date").value.split('-').reverse().join('/')} às ${document.getElementById("time").value}<br><strong>Cliente:</strong> ${document.getElementById("client-name").value}`;
    document.getElementById("modal-confirmacao").style.display = "flex";
}
function fecharModalConfirmacao() { document.getElementById("modal-confirmacao").style.display = "none"; }

async function confirmarEEnviar() {
    const btn = document.getElementById("btn-confirmar-agendamento"); btn.disabled = true;
    const cliente = document.getElementById("client-name").value; const telefone = document.getElementById("client-phone").value.replace(/\D/g, "");
    const dataSQL = document.getElementById("date").value; const horaStr = document.getElementById("time").value;
    let total = 0; let tempo = 0; Object.values(servicosSelecionados).forEach(s => { total += s.preco; tempo += s.duracao; });
    const servs = Object.keys(servicosSelecionados).join(', ');

    const { error } = await _supabase.from('saas_agendamentos').insert({
        slug: TENANT_ATIVO, barbeiro: barbeiroSelecionado, cliente_nome: cliente, cliente_telefone: telefone,
        servicos: servs, data_agendamento: dataSQL, hora_inicio: horaStr, duracao_total: tempo, valor_total: total, status: 'pendente'
    });

    if (error) { btn.disabled = false; return mostrarAlerta("Erro ao salvar."); }

    // Envio correto para o WhatsApp do profissional ou admin cadastrado (Print 5)
    const profObj = (tenantConfig.barbeiros || []).find(b => (typeof b === 'object' ? b.nome : b) === barbeiroSelecionado);
    let numeroProf = (profObj && profObj.whatsapp) ? profObj.whatsapp : tenantConfig.admin_contato;
    if (numeroProf) {
        const dataStr = dataSQL.split('-').reverse().join('/');
        const msg = `*Novo Agendamento!*\n*Cliente:* ${cliente}\n*Serviços:* ${servs}\n*Data:* ${dataStr} às ${horaStr}\n*Total:* R$ ${total.toFixed(2)}`;
        window.open(`https://api.whatsapp.com/send?phone=55${numeroProf.replace(/\D/g, "")}&text=${encodeURIComponent(msg)}`, '_blank');
    }

    fecharModalConfirmacao(); mostrarAlerta("Agendamento concluído!"); setTimeout(() => window.location.reload(), 2000);
}

// PAINEL
function fazerLogin() {
    const user = document.getElementById("login-usuario").value.trim().toLowerCase();
    const pass = document.getElementById("login-senha").value.trim();
    if (!user || !pass) return mostrarAlerta("Preencha os campos.");
    let senhaAdmin = (tenantConfig.senhas_usuarios && tenantConfig.senhas_usuarios['admin']) ? tenantConfig.senhas_usuarios['admin'] : 'admin123';
    if (user === 'admin' && pass === senhaAdmin) {
        usuarioLogado = "Admin"; document.getElementById("login-section").style.display = "none";
        document.getElementById("admin-gear-container").innerHTML = '<div class="btn-engrenagem" onclick="abrirConfiguracoesAdmin()"><i class="fa-solid fa-gear"></i></div>';
        document.getElementById("dashboard-admin").style.display = "block"; atualizarFinanceiroAdmin();
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
    const profObj = (tenantConfig.barbeiros || []).find(b => (typeof b === 'object' ? b.nome : b) === usuarioLogado);
    let hInicio = parseInt(((profObj && profObj.inicio) ? profObj.inicio : tenantConfig.horario_inicio).split(':')[0]);
    let hFim = parseInt(((profObj && profObj.fim) ? profObj.fim : tenantConfig.horario_fim).split(':')[0]);
    const datas = []; const hoje = new Date();
    for (let i=0; i<6; i++) {
        let d = new Date(hoje); d.setDate(hoje.getDate() + i + offsetSemana);
        datas.push(d.toISOString().split('T')[0]);
    }
    const { data: agendamentos } = await _supabase.from('saas_agendamentos').select('*').eq('slug', TENANT_ATIVO).eq('barbeiro', usuarioLogado).in('data_agendamento', datas);
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

// MODAL GERENCIAR ATENDIMENTO (PRINTS 1 E 2)
let atendimentoAtual = null;
function abrirModalGerenciarAtendimento(ag) {
    atendimentoAtual = ag;
    const dataF = ag.data_agendamento.split('-').reverse().join('/');
    const box = document.getElementById("detalhes-atendimento-box");
    box.innerHTML = `<strong>Cliente:</strong> ${ag.cliente_nome}<br>
                     <strong>Telefone:</strong> ${ag.cliente_telefone || 'Não informado'}<br>
                     <strong>Serviço Atual:</strong> ${ag.servicos || 'Serviço Padrão'}<br>
                     <strong>Valor Base:</strong> R$ ${(ag.valor_total || 0).toFixed(2)}<br>
                     <strong>Data/Hora:</strong> ${dataF} às ${ag.hora_inicio}`;
    
    document.getElementById("btn-modal-concluir").onclick = () => concluirAtendimento(ag.id);
    document.getElementById("btn-modal-reagendar").onclick = () => reagendarAtendimento(ag.id);
    document.getElementById("btn-modal-cancelar").onclick = () => cancelarAtendimento(ag.id);
    document.getElementById("btn-modal-lembrete").onclick = () => enviarLembreteWhatsApp(ag);

    document.getElementById("modal-gerenciar-atendimento").style.display = "flex";
}
function fecharModalGerenciar() { document.getElementById("modal-gerenciar-atendimento").style.display = "none"; }

async function concluirAtendimento(id) {
    await _supabase.from('saas_agendamentos').update({ status: 'concluido' }).eq('id', id);
    fecharModalGerenciar(); carregarAgendaBarbeiro();
}
async function cancelarAtendimento(id) {
    if(confirm("Deseja realmente cancelar este agendamento?")) {
        await _supabase.from('saas_agendamentos').delete().eq('id', id);
        fecharModalGerenciar(); carregarAgendaBarbeiro();
    }
}
function reagendarAtendimento(id) {
    alert("Funcionalidade de reagendamento direto. Selecione nova data na agenda.");
    fecharModalGerenciar();
}
function enviarLembreteWhatsApp(ag) {
    const dataF = ag.data_agendamento.split('-').reverse().join('/');
    const msg = `*Olá ${ag.cliente_nome}!* Passando para lembrar do seu agendamento hoje (${dataF} às ${ag.hora_inicio}) com ${usuarioLogado}.`;
    let tel = ag.cliente_telefone ? ag.cliente_telefone.replace(/\D/g, "") : "31994951564";
    window.open(`https://api.whatsapp.com/send?phone=55${tel}&text=${encodeURIComponent(msg)}`, '_blank');
}

// NOVO AGENDAMENTO PELO PAINEL / MODO ENCAIXE (PRINT 4)
function abrirModalMensalistas() { document.getElementById("modal-mensalistas").style.display = "flex"; }
function abrirModalNovoAgendamento() {
    const container = document.getElementById("lista-servicos-checkboxes"); container.innerHTML = "";
    Object.keys(tenantConfig.servicos || {}).forEach(nome => {
        const s = tenantConfig.servicos[nome];
        container.innerHTML += `<label style="font-size:0.8rem; display:flex; align-items:center; gap:6px; cursor:pointer;">
            <input type="checkbox" class="chk-servico-novo" value="${nome}" data-preco="${s.price}" data-tempo="${s.duration}" onchange="calcularTotalNovoServico()"> ${nome} (R$ ${s.price})</label>`;
    });
    document.getElementById("novo-cli-nome").value = "";
    document.getElementById("novo-cli-tel").value = "";
    document.getElementById("check-encaixe").checked = false;
    document.getElementById("modal-novo-agendamento").style.display = "flex";
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

    // Se NÃO for modo encaixe, verifica se já existe agendamento no horário
    if (!isEncaixe) {
        const { data: existe } = await _supabase.from('saas_agendamentos').select('id').eq('slug', TENANT_ATIVO).eq('barbeiro', usuarioLogado).eq('data_agendamento', data).eq('hora_inicio', hora);
        if (existe && existe.length > 0) return alert("Horário já ocupado! Utilize o 'Modo Encaixe' se desejar inserir neste horário.");
    }

    const { error } = await _supabase.from('saas_agendamentos').insert({
        slug: TENANT_ATIVO, barbeiro: usuarioLogado, cliente_nome: nome, cliente_telefone: tel,
        servicos: servicosStr, data_agendamento: data, hora_inicio: hora, duracao_total: duracao, valor_total: total, status: 'pendente'
    });

    if(error) return alert("Erro ao salvar agendamento.");
    fecharModalNovoAgendamento(); carregarAgendaBarbeiro(); alert("Agendamento criado com sucesso!");
}

function bloquearHorario(data, hora) {
    if(confirm(`Bloquear agenda no dia ${data.split('-').reverse().join('/')} às ${hora}?`)) {
        _supabase.from('saas_agendamentos').insert({ slug: TENANT_ATIVO, barbeiro: usuarioLogado, data_agendamento: data, hora_inicio: hora, status: 'bloqueado' }).then(() => carregarAgendaBarbeiro());
    }
}
function desbloquearHorario(id) {
    if(confirm("Libertar este horário?")) {
        _supabase.from('saas_agendamentos').delete().eq('id', id).then(() => carregarAgendaBarbeiro());
    }
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
function calcularTotalDash(ags, filtro) {
    const hoje = new Date(); let total = 0;
    ags.forEach(ag => {
        const dAg = new Date(ag.data_agendamento + 'T12:00:00'); let contar = false;
        if (filtro === 'dia' && dAg.toDateString() === hoje.toDateString()) contar = true;
        if (filtro === 'mes' && dAg.getMonth() === hoje.getMonth() && dAg.getFullYear() === hoje.getFullYear()) contar = true;
        if (filtro === 'semana') {
            const inicio = new Date(hoje); inicio.setDate(hoje.getDate() - hoje.getDay());
            const fim = new Date(inicio); fim.setDate(inicio.getDate() + 6);
            if (dAg >= inicio && dAg <= fim) contar = true;
        }
        if (contar) total += Number(ag.valor_total);
    });
    return total.toFixed(2).replace('.', ',');
}

function aplicarCores(p, f, c, l) {
    document.documentElement.style.setProperty('--primary-color', p); document.documentElement.style.setProperty('--bg-color', f);
    document.documentElement.style.setProperty('--box-color', c); document.documentElement.style.setProperty('--text-color', l);
}
function mudarTabConfig(t, b) {
    document.querySelectorAll('.config-tab-content').forEach(el => el.style.display = 'none');
    document.getElementById("tab-" + t).style.display = 'block';
    document.querySelectorAll('.tab-btn').forEach(btn => { btn.style.background = 'transparent'; btn.style.color = '#AAA'; });
    b.style.background = 'var(--primary-color)'; b.style.color = '#FFF';
}
function abrirConfiguracoesAdmin() { document.getElementById("modal-config-admin").style.display = "flex"; }
function fecharConfiguracoesAdmin() { document.getElementById("modal-config-admin").style.display = "none"; }
