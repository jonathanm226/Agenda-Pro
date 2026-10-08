// === CONFIGURAÇÃO MASTER DO SUPABASE ===
const SUPABASE_URL = "https://doecoosuqibzdsyadsyg.supabase.co";
const SUPABASE_KEY = "sb_publishable_-30z4xAhwJPYmy1bfSEjCw_loKUe8uL";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const urlParams = new URLSearchParams(window.location.search);
const TENANT_ATIVO = urlParams.get('slug') || "padrao";

let tenantConfig = { 
    nome_empresa: "Meu Negócio", 
    slogan: "Agenda pro! Gestão inteligente", 
    whatsapp: "", 
    logo_url: "", 
    endereco: "",
    sobre: "",
    cor_primaria: "#FF6600",
    cor_fundo: "#121212",
    cor_caixas: "#1A1A1A",
    cor_letras: "#FFFFFF",
    barbeiros: [], 
    servicos: {} 
};

const TEMAS_PADRAO = {
    dark: { primaria: "#FF6600", fundo: "#121212", caixas: "#1A1A1A", letras: "#FFFFFF" },
    pink: { primaria: "#FF69B4", fundo: "#FFF0F5", caixas: "#FFFFFF", letras: "#333333" },
    purple: { primaria: "#9B59B6", fundo: "#1E1A24", caixas: "#2B2436", letras: "#FFFFFF" },
    blue: { primaria: "#3498DB", fundo: "#0F172A", caixas: "#1E293B", letras: "#F8FAFC" },
    green: { primaria: "#2ECC71", fundo: "#0F2218", caixas: "#163323", letras: "#ECFDF5" },
    gold: { primaria: "#F1C40F", fundo: "#1A1A1A", caixas: "#262626", letras: "#FFFDF0" }
};

let usuarioLogado = "";
let offsetSemana = 0;
let offsetSemanaAdmin = 0;
let idAtendimentoAtivo = null;
let atendimentoDetalheAtual = null;
let modoMensalistaAtivo = false;

let selectedBarber = "";
let selectedServices = [];

document.addEventListener("DOMContentLoaded", async () => {
    await carregarTenantConfig();
    aplicarIdentidadeVisual(tenantConfig);
    if (document.getElementById("agendar-container")) {
        initAgendar();
    }
    if (document.getElementById("painel-container")) {
        document.getElementById("painel-nome-negocio").textContent = tenantConfig.nome_empresa;
    }
});

async function carregarTenantConfig() {
    try {
        const { data } = await _supabase.from("saas_estabelecimentos").select("*").eq("slug", TENANT_ATIVO).single();
        if (data) {
            tenantConfig.nome_empresa = data.nome_empresa || "Meu Negócio";
            tenantConfig.slogan = data.slogan || "Agenda pro! Gestão inteligente";
            tenantConfig.whatsapp = data.whatsapp || "";
            tenantConfig.logo_url = data.logo_url || "";
            tenantConfig.endereco = data.endereco || "";
            tenantConfig.sobre = data.sobre || "";
            tenantConfig.cor_primaria = data.cor_primaria || "#FF6600";
            tenantConfig.cor_fundo = data.cor_fundo || "#121212";
            tenantConfig.cor_caixas = data.cor_caixas || "#1A1A1A";
            tenantConfig.cor_letras = data.cor_letras || "#FFFFFF";
            tenantConfig.barbeiros = data.barbeiros || [];
            tenantConfig.servicos = data.servicos || {};
        }
    } catch (e) { console.warn("Usando configurações padrão."); }
}

function aplicarIdentidadeVisual(config) {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', config.cor_primaria || '#FF6600');
    root.style.setProperty('--bg-color', config.cor_fundo || '#121212');
    root.style.setProperty('--box-color', config.cor_caixas || '#1A1A1A');
    root.style.setProperty('--text-color', config.cor_letras || '#FFFFFF');
    
    const logos = document.querySelectorAll("img[alt='Logo']");
    logos.forEach(img => { 
        if (config.logo_url && config.logo_url.trim() !== "") {
            img.src = config.logo_url;
            img.style.display = "block";
        } else {
            img.src = "";
            img.style.display = "none";
        }
    });
}

function aplicarTemaPredefinido(nomeTema) {
    if (!TEMAS_PADRAO[nomeTema]) return;
    const t = TEMAS_PADRAO[nomeTema];
    document.getElementById("config-cor-primaria").value = t.primaria;
    document.getElementById("config-cor-fundo").value = t.fundo;
    document.getElementById("config-cor-caixas").value = t.caixas;
    document.getElementById("config-cor-letras").value = t.letras;
}

function removerLogoAtual() {
    tenantConfig.logo_url = "";
    const preview = document.getElementById("logo-preview-admin");
    if (preview) { preview.src = ""; preview.style.display = "none"; }
    const fileInput = document.getElementById("config-logo-file");
    if (fileInput) fileInput.value = "";
    mostrarAlerta("Logo removida com sucesso! Clique em 'Salvar Alterações'.");
}

function mostrarAlerta(texto) {
    document.getElementById("alerta-custom-texto").textContent = texto;
    document.getElementById("modal-alerta-custom").style.display = "flex";
}
function fecharAlertaCustom() {
    document.getElementById("modal-alerta-custom").style.display = "none";
}

// ==========================================
// CLIENTE (AGENDAR.HTML)
// ==========================================
function initAgendar() {
    aplicarIdentidadeVisual(tenantConfig);
    const headerContainer = document.querySelector(".brand-info");
    if(headerContainer) {
        headerContainer.innerHTML = `
            <div class="brand-logo-container"><img id="tenant-logo" src="${tenantConfig.logo_url || ''}" alt="Logo" style="${tenantConfig.logo_url ? '' : 'display:none;'}"></div>
            <div>
                <h1 id="tenant-name" style="font-size: 1.4rem; margin: 0 0 2px 0; color: var(--text-color); font-weight: 700;">${tenantConfig.nome_empresa}</h1>
                <p id="tenant-slogan" style="color: var(--primary-color); font-size: 0.85rem; margin: 0; font-weight: 600;">${tenantConfig.slogan}</p>
            </div>
        `;
    }

    const dateInput = document.getElementById("date");
    if (dateInput) {
        const hoje = new Date();
        const maximo = new Date(); maximo.setDate(hoje.getDate() + 21);
        dateInput.min = hoje.toISOString().split("T")[0];
        dateInput.max = maximo.toISOString().split("T")[0];
        dateInput.value = dateInput.min;
        dateInput.addEventListener("change", checkAvailableTimes);
    }

    renderizarProfissionaisCliente();
    renderizarServicosCliente();
    checkAvailableTimes();
}

function renderizarProfissionaisCliente() {
    const grid = document.getElementById("barbers-grid");
    if (!grid) return;
    grid.innerHTML = "";
    (tenantConfig.barbeiros).forEach((bObj, idx) => {
        let nomeB = typeof bObj === 'object' ? bObj.nome : bObj;
        if (idx === 0) selectedBarber = nomeB;
        grid.innerHTML += `
            <div class="barber-card ${idx === 0 ? 'active' : ''}" onclick="selectBarber(this, '${nomeB}')">
                <i class="fa-solid fa-user-tie" style="font-size: 1.2rem; color: var(--primary-color); margin-bottom: 4px;"></i>
                <h3>${nomeB}</h3>
            </div>`;
    });
}

function renderizarServicosCliente() {
    const grid = document.getElementById("services-grid");
    if (!grid) return;
    grid.innerHTML = "";
    Object.keys(tenantConfig.servicos).forEach(nome => {
        const s = tenantConfig.servicos[nome];
        grid.innerHTML += `
            <div class="service-card" onclick="toggleService(this, '${nome}', ${s.price}, ${s.duration})">
                <div class="service-info">
                    <h3 style="margin:0; font-size:0.9rem;"><i class="fa-regular fa-square checkbox-icon"></i> ${nome}</h3>
                    <span style="font-size:0.75rem; color:#AAA;">${s.duration} min</span>
                </div>
                <span class="price">R$ ${s.price.toFixed(2).replace('.', ',')}</span>
            </div>`;
    });
}

function selectBarber(element, barberName) {
    document.querySelectorAll(".barber-card").forEach(c => c.classList.remove("active"));
    element.classList.add("active");
    selectedBarber = barberName;
    checkAvailableTimes();
}

function toggleService(element, serviceName, price, duration) {
    const icon = element.querySelector(".checkbox-icon");
    const index = selectedServices.findIndex(s => s.name === serviceName);
    if (index > -1) {
        selectedServices.splice(index, 1);
        element.classList.remove("active");
        if (icon) { icon.classList.remove("fa-solid", "fa-square-check"); icon.classList.add("fa-regular", "fa-square"); }
    } else {
        selectedServices.push({ name: serviceName, price: price, duration: duration });
        element.classList.add("active");
        if (icon) { icon.classList.remove("fa-regular", "fa-square"); icon.classList.add("fa-solid", "fa-square-check"); }
    }
    atualizarResumo(); checkAvailableTimes();
}

function atualizarResumo() {
    const container = document.getElementById("resumo-flutuante");
    if (!container) return;
    if (selectedServices.length === 0) { container.style.display = "none"; return; }
    container.style.display = "flex";
    const totalP = selectedServices.reduce((a, s) => a + s.price, 0);
    const totalD = selectedServices.reduce((a, s) => a + s.duration, 0);
    document.getElementById("resumo-qtd-servicos").textContent = `${selectedServices.length} serviço(s)`;
    document.getElementById("resumo-valor-total").textContent = `R$ ${totalP.toFixed(2).replace('.', ',')}`;
    document.getElementById("resumo-duracao").textContent = `${totalD} min`;
}

function fromMin(m) { return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`; }
function toMin(hhmm) { const [h,m] = hhmm.split(':').map(Number); return h*60+m; }

async function checkAvailableTimes() {
    const dateEl = document.getElementById("date");
    const timeSel = document.getElementById("time");
    if (!dateEl || !timeSel || !dateEl.value) return;

    let slots = [];
    for(let m = 8*60; m <= 20*60; m += 30) slots.push(fromMin(m));
    timeSel.innerHTML = "<option disabled selected>A carregar...</option>";

    const { data: ags } = await _supabase.from("saas_agendamentos").select("*").eq("barbeiro", selectedBarber).eq("data", dateEl.value);
    const durMin = selectedServices.reduce((a, s) => a + s.duration, 0) || 40;
    const blocksNeeded = Math.ceil(durMin / 30);
    
    const ocupados = new Set();
    (ags || []).filter(a => a.status !== 'cancelado').forEach(a => {
        let minInicio = toMin(a.horario.substring(0,5));
        let numB = Math.max(1, Math.ceil(40 / 30)); 
        for(let i=0; i<numB; i++) ocupados.add(minInicio + (30*i));
    });

    const hojeStr = new Date().toISOString().split("T")[0];
    const agoraMin = new Date().getHours() * 60 + new Date().getMinutes();
    const eHoje = (dateEl.value === hojeStr);

    timeSel.innerHTML = "<option disabled selected>Selecione o horário</option>";
    slots.forEach(slot => {
        const opt = document.createElement("option");
        opt.value = slot; opt.textContent = slot;
        let minS = toMin(slot);
        let conflito = false;

        if (eHoje && minS <= agoraMin) {
            conflito = true;
        }

        for (let i = 0; i < blocksNeeded; i++) {
            if (ocupados.has(minS + (30*i))) conflito = true;
        }

        if (conflito) { opt.disabled = true; opt.textContent = `${slot} (Indisponível)`; }
        timeSel.appendChild(opt);
    });
}

function abrirModalConfirmacao() {
    if (selectedServices.length === 0) return mostrarAlerta("Selecione pelo menos um serviço.");
    document.getElementById("modal-confirmacao").style.display = "flex";
    const totalP = selectedServices.reduce((a, s) => a + s.price, 0);
    document.getElementById("resumo-agendamento").innerHTML = `
        Data: ${document.getElementById("date").value} às ${document.getElementById("time").value}<br>
        Profissional: ${selectedBarber}<br>
        Total: R$ ${totalP.toFixed(2)}
    `;
}
function fecharModalConfirmacao() { document.getElementById("modal-confirmacao").style.display = "none"; }

async function confirmarEEnviar() {
    const nome = document.getElementById("client-name").value;
    const wpp = document.getElementById("client-phone").value.replace(/\D/g, "");
    if (!nome || wpp.length < 10) return mostrarAlerta("Preencha os seus dados de contacto corretamente.");

    const servNames = selectedServices.map(s => s.name).join(", ");
    const totalP = selectedServices.reduce((a, s) => a + s.price, 0);
    const dataAg = document.getElementById("date").value;
    const horaAg = document.getElementById("time").value;

    const { error } = await _supabase.from("saas_agendamentos").insert([{
        barbeiro: selectedBarber, cliente: nome, telefone: wpp, servico: servNames, preco_total: totalP,
        data: dataAg, horario: horaAg, status: 'ativo', forma_pagamento: 'Pix'
    }]);

    if (!error) {
        mostrarAlerta("Agendamento efetuado com sucesso!");
        
        let wppProfissional = tenantConfig.whatsapp;
        const profObj = tenantConfig.barbeiros.find(b => (typeof b === 'object' ? b.nome : b) === selectedBarber);
        if (profObj && typeof profObj === 'object' && profObj.whatsapp) {
            wppProfissional = profObj.whatsapp.replace(/\D/g, "");
        }

        if (wppProfissional) {
            const msg = `*Novo Agendamento - ${tenantConfig.nome_empresa}*%0A%0A👤 *Cliente:* ${nome}%0A📞 *Tel:* ${wpp}%0A✂️ *Serviço:* ${servNames}%0A👨‍💼 *Profissional:* ${selectedBarber}%0A📅 *Data:* ${dataAg} às ${horaAg}%0A💰 *Valor:* R$ ${totalP.toFixed(2)}`;
            window.open(`https://wa.me/${wppProfissional}?text=${msg}`, '_blank');
        }
        setTimeout(() => { window.location.reload(); }, 1500);
    }
}

// ==========================================
// PAINEL E GESTÃO
// ==========================================
function fazerLogin() {
    const user = document.getElementById("login-usuario").value.trim().toLowerCase();
    const pass = document.getElementById("login-senha").value.trim();
    if (!user || !pass) return mostrarAlerta("Preencha os campos de acesso.");

    if (user === 'admin' && pass === 'admin123') {
        usuarioLogado = "Admin";
        document.getElementById("login-section").style.display = "none";
        document.getElementById("dashboard-admin").style.display = "block";
        document.getElementById("admin-gear-container").innerHTML = `<div class="btn-engrenagem" onclick="abrirConfiguracoesAdmin()" title="Configurações"><i class="fa-solid fa-gear"></i></div>`;
        renderizarAdminParametros();
        atualizarFinanceiroAdmin();
        carregarAtendimentosAdminSemanal();
    } else {
        const profEncontrado = tenantConfig.barbeiros.find(b => {
            let nomeB = typeof b === 'object' ? b.nome : b;
            return nomeB.toLowerCase() === user;
        });

        if (profEncontrado && (pass === (user + '123') || pass === '123456')) {
            usuarioLogado = typeof profEncontrado === 'object' ? profEncontrado.nome : profEncontrado;
            document.getElementById("login-section").style.display = "none";
            document.getElementById("dashboard-barbeiro").style.display = "block";
            document.getElementById("titulo-agenda-barbeiro").textContent = `Agenda: ${usuarioLogado}`;
            carregarAgendaSemanal();
            atualizarFinanceiroProfissional();
        } else {
            mostrarAlerta("Credenciais de acesso inválidas.");
        }
    }
}

function fazerLogout() { window.location.reload(); }

function abrirConfiguracoesAdmin() { document.getElementById("modal-config-admin").style.display = "flex"; }
function fecharConfiguracoesAdmin() { document.getElementById("modal-config-admin").style.display = "none"; }

function mudarSemana(dir) { offsetSemana += dir; carregarAgendaSemanal(); }
function mudarSemanaAdmin(dir) { offsetSemanaAdmin += dir; carregarAtendimentosAdminSemanal(); }

async function carregarAgendaSemanal() {
    const container = document.getElementById("grade-semanal-container");
    container.innerHTML = "A carregar...";

    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const diff = (hoje.getDay() === 0 ? -6 : 1) - hoje.getDay() + (offsetSemana * 7);
    const segunda = new Date(hoje); segunda.setDate(hoje.getDate() + diff);
    
    let dias = [];
    for (let i = 0; i < 6; i++) {
        let d = new Date(segunda); d.setDate(segunda.getDate() + i);
        dias.push({ iso: d.toISOString().split("T")[0], label: d.toLocaleDateString("pt-BR", { weekday: 'short', day: '2-digit' }) });
    }
    document.getElementById("label-periodo-semana").textContent = `${dias[0].label} até ${dias[5].label}`;

    const { data: ags } = await _supabase.from("saas_agendamentos").select("*").ilike("barbeiro", `%${usuarioLogado}%`).gte("data", dias[0].iso).lte("data", dias[5].iso);
    
    container.innerHTML = "";
    dias.forEach(dia => {
        const col = document.createElement("div"); col.className = "day-column";
        col.innerHTML = `<div class="day-header">${dia.label}</div>`;
        const agsDia = (ags || []).filter(a => String(a.data).substring(0,10) === dia.iso && a.status !== 'cancelado');
        
        agsDia.filter(a => a.encaixe).forEach(e => {
            col.innerHTML += `<div class="slot-item encaixe" onclick="abrirAtendimento(${e.id})">🚨 ${e.horario.substring(0,5)}<br>${e.cliente}</div>`;
        });

        for(let m = 8*60; m <= 20*60; m += 30) {
            let h = fromMin(m);
            let ag = agsDia.find(a => String(a.horario).substring(0,5) === h && !a.encaixe);
            if (ag) {
                let cls = ag.recorrente ? "mensalista" : (ag.status === 'concluido' ? "concluded" : "booked");
                col.innerHTML += `<div class="slot-item ${cls}" onclick="abrirAtendimento(${ag.id})">${h}<br>${ag.cliente}</div>`;
            } else {
                col.innerHTML += `<div class="slot-item available">${h} Livre</div>`;
            }
        }
        container.appendChild(col);
    });
}

async function carregarAtendimentosAdminSemanal() {
    const container = document.getElementById("lista-atendimentos-admin");
    container.innerHTML = "A carregar...";

    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const diff = (hoje.getDay() === 0 ? -6 : 1) - hoje.getDay() + (offsetSemanaAdmin * 7);
    const segunda = new Date(hoje); segunda.setDate(hoje.getDate() + diff);
    const sabado = new Date(segunda); sabado.setDate(segunda.getDate() + 5);

    const sIso = segunda.toISOString().split("T")[0];
    const fIso = sabado.toISOString().split("T")[0];

    document.getElementById("label-periodo-admin").textContent = `${segunda.toLocaleDateString("pt-BR", {day:'2-digit', month:'2-digit'})} até ${sabado.toLocaleDateString("pt-BR", {day:'2-digit', month:'2-digit'})}`;

    const { data: ags } = await _supabase.from("saas_agendamentos").select("*").gte("data", sIso).lte("data", fIso).neq("status", "cancelado").order('data', { ascending: true });

    if (!ags || ags.length === 0) {
        container.innerHTML = `<span style="font-size: 0.75rem; color: #777; text-align: center; padding: 10px;">Sem agendamentos nesta semana.</span>`;
        return;
    }

    container.innerHTML = "";
    ags.forEach(a => {
        let iconePag = "💠";
        const pag = (a.forma_pagamento || 'Pix').toLowerCase();
        if (pag.includes('dinheiro')) iconePag = "💵";
        else if (pag.includes('débito') || pag.includes('debito') || pag.includes('crédito') || pag.includes('credito')) iconePag = "💳";

        container.innerHTML += `
            <div class="admin-atendimento-item">
                <div>
                    <strong>${a.data} às ${a.horario.substring(0,5)}</strong><br>
                    <span>👤 ${a.cliente} (${a.servico || 'Serviço'})</span><br>
                    <span style="color: var(--primary-color);">👨‍💼 Profissional: <strong>${a.barbeiro}</strong></span>
                </div>
                <div style="text-align: right;">
                    <strong style="color: #25D366;">R$ ${(parseFloat(a.preco_total)||0).toFixed(2)}</strong><br>
                    <span style="font-size: 0.7rem; color: #AAA;">${iconePag} ${a.forma_pagamento || 'Pix'}</span>
                </div>
            </div>`;
    });
}

// ==========================================
// GESTÃO DE ATENDIMENTO
// ==========================================
async function abrirAtendimento(id) {
    idAtendimentoAtivo = id;
    const { data } = await _supabase.from("saas_agendamentos").select("*").eq("id", id).single();
    if (!data) return;
    atendimentoDetalheAtual = data;

    document.getElementById("action-modal-details").innerHTML = `
        <strong>Cliente:</strong> ${data.cliente}<br>
        <strong>Serviço:</strong> ${data.servico}<br>
        <strong>Data/Hora:</strong> ${data.data} às ${data.horario.substring(0,5)}<br>
        <strong>Valor:</strong> R$ ${(parseFloat(data.preco_total)||0).toFixed(2)}
    `;
    
    document.getElementById("secao-conclusao-pagamento").style.display = "none";
    document.getElementById("secao-reagendamento").style.display = "none";
    document.getElementById("secao-botoes-principais").style.display = "flex";
    document.getElementById("custom-action-modal").style.display = "flex";
}

function fecharModalAtendimento() {
    document.getElementById("custom-action-modal").style.display = "none";
}

function mostrarSecaoConclusao() {
    document.getElementById("secao-botoes-principais").style.display = "none";
    document.getElementById("secao-conclusao-pagamento").style.display = "block";
}

function mostrarSecaoReagendamento() {
    document.getElementById("secao-botoes-principais").style.display = "none";
    document.getElementById("secao-reagendamento").style.display = "block";
    document.getElementById("reagendar-data").value = atendimentoDetalheAtual.data;
    document.getElementById("reagendar-horario").value = atendimentoDetalheAtual.horario.substring(0,5);
}

async function confirmarConclusaoComPagamento() {
    if (!idAtendimentoAtivo) return;
    const formaPagamento = document.getElementById("select-forma-pagamento").value;

    await _supabase.from("saas_agendamentos").update({ 
        status: 'concluido', 
        forma_pagamento: formaPagamento 
    }).eq('id', idAtendimentoAtivo);

    fecharModalAtendimento();
    carregarAgendaSemanal();
    atualizarFinanceiroProfissional();
    mostrarAlerta("Atendimento concluído com sucesso!");
}

async function salvarReagendamento() {
    if (!idAtendimentoAtivo) return;
    const novaData = document.getElementById("reagendar-data").value;
    const novoHorario = document.getElementById("reagendar-horario").value;

    if (!novaData || !novoHorario) return mostrarAlerta("Preencha a nova data e horário.");

    const { error } = await _supabase.from("saas_agendamentos").update({ 
        data: novaData, 
        horario: novoHorario 
    }).eq('id', idAtendimentoAtivo);

    if (!error) {
        mostrarAlerta("Atendimento reagendado com sucesso!");
        fecharModalAtendimento();
        carregarAgendaSemanal();
    } else {
        mostrarAlerta("Erro ao reagendar: " + error.message);
    }
}

function enviarLembreteWhatsApp() {
    if (!atendimentoDetalheAtual) return;
    const tel = atendimentoDetalheAtual.telefone ? atendimentoDetalheAtual.telefone.replace(/\D/g, "") : "";
    if (!tel) return mostrarAlerta("Este cliente não tem um número de telefone válido registado.");

    const msg = `Olá *${atendimentoDetalheAtual.cliente}*, passando para lembrar do seu agendamento de *${atendimentoDetalheAtual.servico}* na *${tenantConfig.nome_empresa}* marcado para o dia *${atendimentoDetalheAtual.data}* às *${atendimentoDetalheAtual.horario.substring(0,5)}*. Contamos com a sua presença! 🚀`;
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank');
}

async function executarAcaoAtendimento(status) {
    if (!idAtendimentoAtivo) return;
    await _supabase.from("saas_agendamentos").update({ status: status }).eq('id', idAtendimentoAtivo);
    fecharModalAtendimento();
    carregarAgendaSemanal();
    atualizarFinanceiroProfissional();
}

// ==========================================
// MENSALISTAS
// ==========================================
function abrirModalMensalista() {
    modoMensalistaAtivo = true;
    document.getElementById("titulo-modal-manual").textContent = "Criar Cliente Mensalista";
    document.getElementById("bloco-mensalista-opcoes").style.display = "block";
    const h = new Date();
    document.getElementById("manual-data").value = h.toISOString().split("T")[0];
    document.getElementById("modal-agendamento-manual").style.display = "flex";
}

// ==========================================
// RESUMO FINANCEIRO
// ==========================================
async function atualizarFinanceiroAdmin() {
    const filtro = document.getElementById("filtro-financeiro-admin").value;
    const { data: ags } = await _supabase.from("saas_agendamentos").select("*").eq("status", "concluido");
    
    let totalGeral = 0;
    let pix = 0, dinheiro = 0, debito = 0, credito = 0;

    (ags || []).forEach(ag => {
        if (validarFiltroData(ag.data, filtro)) {
            const val = parseFloat(ag.preco_total) || 0;
            totalGeral += val;
            const pag = (ag.forma_pagamento || 'Pix').toLowerCase();
            if (pag.includes('dinheiro')) dinheiro += val;
            else if (pag.includes('débito' ) || pag.includes('debito')) debito += val;
            else if (pag.includes('crédito') || pag.includes('credito')) credito += val;
            else pix += val;
        }
    });

    document.getElementById("valor-financeiro-admin").textContent = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
    document.getElementById("val-pix").textContent = `R$ ${pix.toFixed(2).replace('.', ',')}`;
    document.getElementById("val-dinheiro").textContent = `R$ ${dinheiro.toFixed(2).replace('.', ',')}`;
    document.getElementById("val-debito").textContent = `R$ ${debito.toFixed(2).replace('.', ',')}`;
    document.getElementById("val-credito").textContent = `R$ ${credito.toFixed(2).replace('.', ',')}`;
}

async function atualizarFinanceiroProfissional() {
    const filtro = document.getElementById("filtro-financeiro-prof").value;
    const { data: ags } = await _supabase.from("saas_agendamentos").select("*").ilike("barbeiro", `%${usuarioLogado}%`).eq("status", "concluido");
    
    let total = 0;
    (ags || []).forEach(ag => {
        if (validarFiltroData(ag.data, filtro)) total += parseFloat(ag.preco_total) || 0;
    });
    document.getElementById("valor-financeiro-prof").textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function validarFiltroData(dataStr, filtro) {
    const hojeStr = new Date().toISOString().split("T")[0];
    const agora = new Date();
    const dataAgStr = String(dataStr).substring(0, 10);
    const dataAg = new Date(dataAgStr + "T00:00:00");

    if (filtro === 'dia') return dataAgStr === hojeStr;
    if (filtro === 'semana') {
        const inicioSemana = new Date(agora); inicioSemana.setDate(agora.getDate() - agora.getDay()); inicioSemana.setHours(0,0,0,0);
        const fimSemana = new Date(inicioSemana); fimSemana.setDate(inicioSemana.getDate() + 6);
        return dataAg >= inicioSemana && dataAg <= fimSemana;
    }
    if (filtro === 'mes') {
        return dataAg.getMonth() === agora.getMonth() && dataAg.getFullYear() === agora.getFullYear();
    }
    return false;
}

function abrirModalAgendamentoManual() {
    modoMensalistaAtivo = false;
    document.getElementById("titulo-modal-manual").textContent = "Novo Agendamento Avulso";
    document.getElementById("bloco-mensalista-opcoes").style.display = "none";
    const h = new Date();
    document.getElementById("manual-data").value = h.toISOString().split("T")[0];
    document.getElementById("modal-agendamento-manual").style.display = "flex";
}
function fecharModalAgendamentoManual() { document.getElementById("modal-agendamento-manual").style.display = "none"; }

async function salvarAgendamentoManual() {
    const isEncaixe = document.getElementById("manual-encaixe").checked;
    const nomeCliente = document.getElementById("manual-cliente").value || "Balcão";
    const telCliente = document.getElementById("manual-telefone").value.replace(/\D/g, "");
    const servicoNome = document.getElementById("manual-servico").value || "Corte";
    const precoVal = parseFloat(document.getElementById("manual-preco").value) || 35;
    const pagForma = document.getElementById("manual-pagamento").value;
    const dataBaseStr = document.getElementById("manual-data").value;
    const horarioStr = document.getElementById("manual-horario").value;

    if (!dataBaseStr || !horarioStr) return mostrarAlerta("Preencha a data e o horário.");

    let iteracoes = modoMensalistaAtivo ? parseInt(document.getElementById("manual-recorrencia-semanas").value) || 4 : 1;

    for (let i = 0; i < iteracoes; i++) {
        let d = new Date(dataBaseStr + "T00:00:00");
        d.setDate(d.getDate() + (i * 7));
        let dataIso = d.toISOString().split("T")[0];

        await _supabase.from("saas_agendamentos").insert([{
            barbeiro: usuarioLogado,
            cliente: nomeCliente,
            telefone: telCliente,
            servico: servicoNome,
            preco_total: precoVal,
            forma_pagamento: pagForma,
            data: dataIso,
            horario: horarioStr,
            status: 'ativo',
            encaixe: isEncaixe,
            recorrente: modoMensalistaAtivo
        }]);
    }

    fecharModalAgendamentoManual();
    carregarAgendaSemanal();
    atualizarFinanceiroProfissional();
    mostrarAlerta(modoMensalistaAtivo ? "Mensalista criado com sucesso para as próximas semanas!" : "Agendamento avulso registado!");
}

// ==========================================
// PARÂMETROS E CONFIGURAÇÃO
// ==========================================
function renderizarAdminParametros() {
    const preview = document.getElementById("logo-preview-admin");
    if (preview) {
        if (tenantConfig.logo_url && tenantConfig.logo_url.trim() !== "") {
            preview.src = tenantConfig.logo_url;
            preview.style.display = "block";
        } else {
            preview.src = "";
            preview.style.display = "none";
        }
    }
    document.getElementById("config-nome-empresa").value = tenantConfig.nome_empresa || "";
    document.getElementById("config-whatsapp").value = tenantConfig.whatsapp || "";
    document.getElementById("config-endereco").value = tenantConfig.endereco || "";
    document.getElementById("config-sobre").value = tenantConfig.sobre || "";
    document.getElementById("config-cor-primaria").value = tenantConfig.cor_primaria || "#FF6600";
    document.getElementById("config-cor-fundo").value = tenantConfig.cor_fundo || "#121212";
    document.getElementById("config-cor-caixas").value = tenantConfig.cor_caixas || "#1A1A1A";
    document.getElementById("config-cor-letras").value = tenantConfig.cor_letras || "#FFFFFF";
    renderListasConfig();
}

function renderListasConfig() {
    const listP = document.getElementById("lista-profissionais-config");
    listP.innerHTML = "";
    (tenantConfig.barbeiros || []).forEach((p, i) => {
        let nomeP = typeof p === 'object' ? p.nome : p;
        let wppP = typeof p === 'object' ? (p.whatsapp || 'Sem WhatsApp') : 'Sem WhatsApp';
        listP.innerHTML += `<div style="background:var(--bg-color); padding:6px; border-radius:4px; display:flex; justify-content:space-between; font-size:0.8rem; align-items:center;">
            <span><strong>${nomeP}</strong> (${wppP})</span><button style="color:#e74c3c; background:none; border:none; cursor:pointer;" onclick="removerProfissional(${i})"><i class="fa-solid fa-trash"></i></button></div>`;
    });

    const listS = document.getElementById("lista-servicos-config");
    listS.innerHTML = "";
    Object.keys(tenantConfig.servicos).forEach(nome => {
        const s = tenantConfig.servicos[nome];
        listS.innerHTML += `<div style="background:var(--bg-color); padding:6px; border-radius:4px; display:flex; justify-content:space-between; font-size:0.8rem;">
            <span>${nome} - R$ ${s.price} (${s.duration}m)</span><button style="color:#e74c3c; background:none; border:none; cursor:pointer;" onclick="removerServico('${nome}')"><i class="fa-solid fa-trash"></i></button></div>`;
    });
}

function adicionarProfissional() {
    const nomeVal = document.getElementById("novo-profissional-nome").value.trim();
    const wppVal = document.getElementById("novo-profissional-wpp").value.trim().replace(/\D/g, "");
    if (nomeVal) {
        tenantConfig.barbeiros.push({ nome: nomeVal, whatsapp: wppVal });
        document.getElementById("novo-profissional-nome").value = "";
        document.getElementById("novo-profissional-wpp").value = "";
        renderListasConfig();
    }
}
function removerProfissional(i) { tenantConfig.barbeiros.splice(i, 1); renderListasConfig(); }

function adicionarServico() {
    const nome = document.getElementById("novo-servico-nome").value.trim();
    const p = parseFloat(document.getElementById("novo-servico-preco").value);
    const d = parseInt(document.getElementById("novo-servico-tempo").value);
    if (nome && p && d) {
        tenantConfig.servicos[nome] = { price: p, duration: d };
        renderListasConfig();
    }
}
function removerServico(nome) { delete tenantConfig.servicos[nome]; renderListasConfig(); }

async function salvarConfiguracoesGerais() {
    const btnSalvar = document.querySelector("button[onclick='salvarConfiguracoesGerais()']");
    const textoOriginal = btnSalvar.textContent;
    btnSalvar.textContent = "A salvar...";
    btnSalvar.disabled = true;

    const fileInput = document.getElementById("config-logo-file");
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${TENANT_ATIVO}_logo_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await _supabase.storage.from('Logos').upload(fileName, file, { cacheControl: '3600', upsert: true });
        if (uploadError) {
            mostrarAlerta("Erro ao enviar imagem: " + uploadError.message);
            btnSalvar.textContent = textoOriginal; btnSalvar.disabled = false; return;
        }
        const { data: publicUrlData } = _supabase.storage.from('Logos').getPublicUrl(fileName);
        tenantConfig.logo_url = publicUrlData.publicUrl;
    }

    tenantConfig.nome_empresa = document.getElementById("config-nome-empresa").value.trim() || "Meu Negócio";
    tenantConfig.whatsapp = document.getElementById("config-whatsapp").value.trim();
    tenantConfig.endereco = document.getElementById("config-endereco").value.trim();
    tenantConfig.sobre = document.getElementById("config-sobre").value.trim();
    tenantConfig.cor_primaria = document.getElementById("config-cor-primaria").value;
    tenantConfig.cor_fundo = document.getElementById("config-cor-fundo").value;
    tenantConfig.cor_caixas = document.getElementById("config-cor-caixas").value;
    tenantConfig.cor_letras = document.getElementById("config-cor-letras").value;

    const { error } = await _supabase.from("saas_estabelecimentos").upsert({
        slug: TENANT_ATIVO,
        nome_empresa: tenantConfig.nome_empresa,
        whatsapp: tenantConfig.whatsapp,
        logo_url: tenantConfig.logo_url,
        endereco: tenantConfig.endereco,
        sobre: tenantConfig.sobre,
        cor_primaria: tenantConfig.cor_primaria,
        cor_fundo: tenantConfig.cor_fundo,
        cor_caixas: tenantConfig.cor_caixas,
        cor_letras: tenantConfig.cor_letras,
        barbeiros: tenantConfig.barbeiros,
        servicos: tenantConfig.servicos
    }, { onConflict: 'slug' });

    btnSalvar.textContent = textoOriginal;
    btnSalvar.disabled = false;

    if (!error) {
        mostrarAlerta("Configurações guardadas com sucesso!");
        aplicarIdentidadeVisual(tenantConfig);
        document.getElementById("painel-nome-negocio").textContent = tenantConfig.nome_empresa;
        fecharConfiguracoesAdmin();
    } else {
        mostrarAlerta("Erro ao gravar: " + error.message);
    }
}
