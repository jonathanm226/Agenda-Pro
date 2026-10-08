// === CONFIGURAÇÃO MASTER DO SUPABASE ===
const SUPABASE_URL = "https://doecoosuqibzdsyadsyg.supabase.co";
const SUPABASE_KEY = "sb_publishable_-30z4xAhwJPYmy1bfSEjCw_loKUe8uL";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const urlParams = new URLSearchParams(window.location.search);
const TENANT_ATIVO = urlParams.get('slug') || "padrao";

// Estrutura Base
let tenantConfig = { 
    nome_empresa: "Meu Negócio", 
    slogan: "Agenda pro! Gestão inteligente", 
    whatsapp: "", 
    logo_url: "", 
    cor_primaria: "#FF6600",
    cor_fundo: "#121212",
    cor_caixas: "#1A1A1A",
    cor_letras: "#FFFFFF",
    barbeiros: ["Willian"], 
    servicos: {
        "Corte de Cabelo": { price: 45, duration: 40 },
        "Barba Completa": { price: 35, duration: 20 }
    }
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
    
    if (document.getElementById("agendar-container")) initAgendar();
    
    if (document.getElementById("painel-container")) {
        const logo = document.getElementById("painel-logo");
        if(logo && tenantConfig.logo_url) {
            logo.src = tenantConfig.logo_url;
            logo.style.display = "block";
        }
        document.getElementById("painel-nome-negocio").textContent = tenantConfig.nome_empresa;
    }
});

async function carregarTenantConfig() {
    try {
        const { data } = await _supabase.from("saas_estabelecimentos").select("*").eq("slug", TENANT_ATIVO).single();
        if (data) Object.assign(tenantConfig, data);
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
        if (config.logo_url) { img.src = config.logo_url; img.style.display = "block"; } 
        else img.style.display = "none";
    });
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
    if(modalCustom) modalCustom.style.display = "none";
}

// ==========================================
// CLIENTE (AGENDAR.HTML) - COM REDIRECT PILOTO
// ==========================================
function initAgendar() {
    document.getElementById("tenant-name").textContent = tenantConfig.nome_empresa;
    document.getElementById("tenant-slogan").textContent = tenantConfig.slogan;
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
    (tenantConfig.barbeiros || []).forEach((bObj, idx) => {
        let nomeB = typeof bObj === 'object' ? bObj.nome : bObj;
        if (idx === 0) selectedBarber = nomeB;
        grid.innerHTML += `
            <div class="barber-card ${idx === 0 ? 'active' : ''}" onclick="selectBarber(this, '${nomeB}')">
                <i class="fa-solid fa-user-tie" style="font-size: 1.5rem; color: var(--primary-color); margin-bottom: 8px;"></i>
                <h3 style="font-size: 0.95rem; margin:0;">${nomeB}</h3>
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
                    <h3><i class="fa-regular fa-square checkbox-icon" style="color: #666;"></i> ${nome}</h3>
                    <span>${s.duration} min</span>
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
        if (icon) { icon.classList.remove("fa-solid", "fa-square-check"); icon.classList.add("fa-regular", "fa-square"); icon.style.color = "#666"; }
    } else {
        selectedServices.push({ name: serviceName, price: price, duration: duration });
        element.classList.add("active");
        if (icon) { icon.classList.remove("fa-regular", "fa-square"); icon.classList.add("fa-solid", "fa-square-check"); icon.style.color = "var(--primary-color)"; }
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

        if (eHoje && minS <= agoraMin) conflito = true;
        for (let i = 0; i < blocksNeeded; i++) { if (ocupados.has(minS + (30*i))) conflito = true; }

        if (conflito) { opt.disabled = true; opt.textContent = `${slot} (Ocupado)`; }
        timeSel.appendChild(opt);
    });
}

function abrirModalConfirmacao() {
    if (selectedServices.length === 0) return mostrarAlerta("Selecione pelo menos um serviço.");

    const timeSel = document.getElementById("time");
    if (!timeSel || !timeSel.value || timeSel.value.includes("Selecione") || timeSel.value.includes("Ocupado") || timeSel.value.includes("carregar")) {
        return mostrarAlerta("Por favor, selecione um horário válido e disponível.");
    }

    const nome = document.getElementById("client-name").value.trim();
    const wpp = document.getElementById("client-phone").value.replace(/\D/g, "");
    if (!nome || wpp.length < 10) return mostrarAlerta("Preencha o seu Nome e WhatsApp corretamente antes de continuar.");

    const modal = document.getElementById("modal-confirmacao");
    if(modal) modal.style.display = "flex";
    
    const totalP = selectedServices.reduce((a, s) => a + s.price, 0);
    const dataFormatada = document.getElementById("date").value.split("-").reverse().join("/");

    document.getElementById("resumo-agendamento").innerHTML = `
        <div style="margin-bottom: 8px;"><i class="fa-regular fa-calendar" style="color:var(--primary-color);"></i> <strong>Data:</strong> ${dataFormatada} às ${timeSel.value}</div>
        <div style="margin-bottom: 8px;"><i class="fa-solid fa-user-tie" style="color:var(--primary-color);"></i> <strong>Profissional:</strong> ${selectedBarber}</div>
        <div style="margin-bottom: 8px;"><i class="fa-solid fa-scissors" style="color:var(--primary-color);"></i> <strong>Serviços:</strong> ${selectedServices.map(s => s.name).join(", ")}</div>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 1.2rem; color: #25D366; text-align: center;">
            <strong>Total Estimado: R$ ${totalP.toFixed(2).replace('.', ',')}</strong>
        </div>
    `;
}

function fecharModalConfirmacao() { document.getElementById("modal-confirmacao").style.display = "none"; }

async function confirmarEEnviar() {
    const btnConfirmar = document.getElementById("btn-confirmar-agendamento");
    if (btnConfirmar) {
        btnConfirmar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A gravar agendamento...';
        btnConfirmar.disabled = true;
    }

    const nome = document.getElementById("client-name").value.trim();
    const wpp = document.getElementById("client-phone").value.replace(/\D/g, "");
    const servNames = selectedServices.map(s => s.name).join(", ");
    const totalP = selectedServices.reduce((a, s) => a + s.price, 0);
    const dataAg = document.getElementById("date").value;
    const horaAg = document.getElementById("time").value;

    try {
        const { error } = await _supabase.from("saas_agendamentos").insert([{
            barbeiro: selectedBarber, cliente: nome, telefone: wpp, servico: servNames, preco_total: totalP,
            data: dataAg, horario: horaAg, status: 'ativo', forma_pagamento: 'Dinheiro'
        }]);

        if (error) throw error;
        fecharModalConfirmacao();
        
        // Número Piloto configurado
        const wppPiloto = "5531994951564";
        const dataFormatada = dataAg.split("-").reverse().join("/");
        const msg = `✅ *NOVO AGENDAMENTO CONFIRMADO!* ✅%0A%0AOlá! Segue a confirmação do meu horário na *${tenantConfig.nome_empresa}*:%0A%0A👤 *Cliente:* ${nome}%0A📞 *WhatsApp:* ${wpp}%0A✂️ *Serviços:* ${servNames}%0A👨‍💼 *Profissional:* ${selectedBarber}%0A📅 *Data:* ${dataFormatada} às ${horaAg}%0A💰 *Valor Estimado:* R$ ${totalP.toFixed(2).replace('.', ',')}`;

        // Redirecionamento 100% seguro contra pop-up blockers
        window.location.href = `https://wa.me/${wppPiloto}?text=${msg}`;

    } catch (err) {
        console.error(err);
        mostrarAlerta("Ocorreu um erro ao gravar o agendamento. Verifique sua conexão e tente novamente.");
        if (btnConfirmar) {
            btnConfirmar.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Confirmar e Enviar';
            btnConfirmar.disabled = false;
        }
    }
}


// ==========================================
// PAINEL DE GESTÃO - LOGIN DINÂMICO RESTAURADO
// ==========================================
function fazerLogin() {
    const user = document.getElementById("login-usuario").value.trim().toLowerCase();
    const pass = document.getElementById("login-senha").value.trim();
    
    if (!user || !pass) return mostrarAlerta("Preencha os campos de acesso.");

    if (user === 'admin' && pass === 'admin123') {
        usuarioLogado = "Admin";
        document.getElementById("login-section").style.display = "none";
        
        document.getElementById("admin-gear-container").innerHTML = `<div class="btn-engrenagem" onclick="abrirConfiguracoesAdmin()" title="Configurações"><i class="fa-solid fa-gear"></i></div>`;
        const dashAdmin = document.getElementById("dashboard-admin");
        if(dashAdmin) {
            dashAdmin.style.display = "block";
            renderizarAdminParametros();
            atualizarFinanceiroAdmin();
            carregarAtendimentosAdminSemanal();
        }
    } else {
        // Validação Dinâmica do Tenant (Configuração)
        const profEncontrado = tenantConfig.barbeiros.find(b => {
            let nomeB = typeof b === 'object' ? b.nome : b;
            return nomeB.toLowerCase() === user;
        });

        // Libera acesso se bater com o SaaS ou com o usuário Fallback Willian
        if ((profEncontrado && (pass === (user + '123') || pass === '123456')) || (user === 'willian' && pass === 'willian123')) {
            usuarioLogado = profEncontrado ? (typeof profEncontrado === 'object' ? profEncontrado.nome : profEncontrado) : "Willian";
            document.getElementById("login-section").style.display = "none";
            
            const dashBarber = document.getElementById("dashboard-barbeiro");
            if (dashBarber) {
                dashBarber.style.display = "block";
                document.getElementById("titulo-agenda-barbeiro").innerHTML = `<i class="fa-solid fa-calendar-check"></i> Agenda: ${usuarioLogado}`;
                offsetSemana = 0;
                carregarAgendaSemanal();
                atualizarFinanceiroProfissional();
            }
        } else {
            mostrarAlerta("Credenciais de acesso inválidas.");
        }
    }
}

function fazerLogout() { window.location.reload(); }

function mudarSemana(dir) { offsetSemana += dir; carregarAgendaSemanal(); }
function mudarSemanaAdmin(dir) { offsetSemanaAdmin += dir; carregarAtendimentosAdminSemanal(); }

async function carregarAgendaSemanal() {
    const container = document.getElementById("grade-semanal-container");
    container.innerHTML = "<span style='font-size:0.8rem; color:#AAA;'>A carregar...</span>";

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

// ==========================================
// GESTÃO DE ATENDIMENTO (COM CÁLCULO DINÂMICO EXTRAS)
// ==========================================
async function abrirAtendimento(id) {
    idAtendimentoAtivo = id;
    const { data } = await _supabase.from("saas_agendamentos").select("*").eq("id", id).single();
    if (!data) return;
    atendimentoDetalheAtual = data;
    const precoOriginal = parseFloat(data.preco_total) || 35;

    document.getElementById("action-modal-details").innerHTML = `
        <div style="margin-bottom:6px;"><strong>Cliente:</strong> ${data.cliente}</div>
        <div style="margin-bottom:6px;"><strong>Serviço Atual:</strong> ${data.servico}</div>
        <div style="margin-bottom:6px;"><strong>Data/Hora:</strong> ${data.data.split('-').reverse().join('/')} às ${data.horario.substring(0,5)}</div>
        <div style="margin-bottom:6px; color: #25D366; font-size:1.1rem;"><strong>Valor Base: R$ ${precoOriginal.toFixed(2).replace('.', ',')}</strong></div>
    `;
    
    document.getElementById("secao-conclusao-pagamento").style.display = "none";
    document.getElementById("secao-reagendamento").style.display = "none";
    document.getElementById("secao-botoes-principais").style.display = "flex";

    // EXTRAS - Preenchendo dinamicamente e injetando a função onchange
    const containerExtras = document.getElementById("extras-servicos-container");
    containerExtras.innerHTML = "";
    Object.keys(tenantConfig.servicos).forEach(serv => {
        const precoServ = tenantConfig.servicos[serv].price;
        containerExtras.innerHTML += `
            <label style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; cursor:pointer; border: 1px solid rgba(255,255,255,0.1);">
                <span style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" class="chk-extra" value="${serv}" data-preco="${precoServ}" style="width:18px; height: 18px; accent-color: var(--primary-color);" onchange="recalcularTotalDinamico(${precoOriginal})"> ${serv}</span>
                <span style="color:var(--primary-color); font-weight:bold; font-size:0.85rem;">+ R$ ${precoServ.toFixed(2).replace('.',',')}</span>
            </label>
        `;
    });
    recalcularTotalDinamico(precoOriginal);
    document.getElementById("custom-action-modal").style.display = "flex";
}

function recalcularTotalDinamico(precoBase) {
    let acrescimo = 0;
    document.querySelectorAll(".chk-extra:checked").forEach(chk => { acrescimo += parseFloat(chk.dataset.preco); });
    const total = precoBase + acrescimo;
    document.getElementById("valor-total-atualizado").textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function fecharModalAtendimento() { document.getElementById("custom-action-modal").style.display = "none"; }
function mostrarSecaoConclusao() { document.getElementById("secao-botoes-principais").style.display = "none"; document.getElementById("secao-conclusao-pagamento").style.display = "block"; }
function mostrarSecaoReagendamento() { 
    document.getElementById("secao-botoes-principais").style.display = "none"; 
    document.getElementById("secao-reagendamento").style.display = "block"; 
    document.getElementById("reagendar-data").value = atendimentoDetalheAtual.data;
    document.getElementById("reagendar-horario").value = atendimentoDetalheAtual.horario.substring(0,5);
}

async function confirmarConclusaoComPagamento() {
    if (!idAtendimentoAtivo || !atendimentoDetalheAtual) return;
    const formaPagamento = document.getElementById("select-forma-pagamento").value;
    
    let servicosAtuais = atendimentoDetalheAtual.servico ? atendimentoDetalheAtual.servico.split(",").map(s => s.trim()) : [];
    let acrescimo = 0;

    document.querySelectorAll(".chk-extra:checked").forEach(chk => {
        if (!servicosAtuais.includes(chk.value)) {
            servicosAtuais.push(chk.value);
            acrescimo += parseFloat(chk.dataset.preco);
        }
    });

    const novoTotal = (parseFloat(atendimentoDetalheAtual.preco_total) || 35) + acrescimo;

    await _supabase.from("saas_agendamentos").update({ 
        status: 'concluido', 
        forma_pagamento: formaPagamento,
        servico: servicosAtuais.join(", "),
        preco_total: novoTotal
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

    await _supabase.from("saas_agendamentos").update({ data: novaData, horario: novoHorario }).eq('id', idAtendimentoAtivo);
    mostrarAlerta("Atendimento reagendado com sucesso!");
    fecharModalAtendimento();
    carregarAgendaSemanal();
}

async function executarAcaoAtendimento(status) {
    if (!idAtendimentoAtivo) return;
    await _supabase.from("saas_agendamentos").update({ status: status }).eq('id', idAtendimentoAtivo);
    fecharModalAtendimento();
    carregarAgendaSemanal();
    atualizarFinanceiroProfissional();
}

function enviarLembreteWhatsApp() {
    if (!atendimentoDetalheAtual) return;
    const tel = atendimentoDetalheAtual.telefone ? atendimentoDetalheAtual.telefone.replace(/\D/g, "") : "";
    if (!tel) return mostrarAlerta("Cliente sem telefone cadastrado.");
    const msg = `Olá *${atendimentoDetalheAtual.cliente}*, passando para lembrar do seu agendamento de *${atendimentoDetalheAtual.servico}* na *${tenantConfig.nome_empresa}* marcado para o dia *${atendimentoDetalheAtual.data.split('-').reverse().join('/')}* às *${atendimentoDetalheAtual.horario.substring(0,5)}*. Contamos com a sua presença! 🚀`;
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ==========================================
// MENSALISTAS E ENCAIXES
// ==========================================
function abrirModalAgendamentoManual() {
    modoMensalistaAtivo = false;
    document.getElementById("titulo-modal-manual").innerHTML = `<i class="fa-solid fa-plus"></i> Novo Agendamento Avulso`;
    document.getElementById("bloco-mensalista-opcoes").style.display = "none";
    document.getElementById("manual-data").value = new Date().toISOString().split("T")[0];
    document.getElementById("modal-agendamento-manual").style.display = "flex";
}

function abrirModalMensalista() {
    modoMensalistaAtivo = true;
    document.getElementById("titulo-modal-manual").innerHTML = `<i class="fa-solid fa-star"></i> Cadastrar Mensalista`;
    document.getElementById("bloco-mensalista-opcoes").style.display = "block";
    document.getElementById("manual-data").value = new Date().toISOString().split("T")[0];
    document.getElementById("modal-agendamento-manual").style.display = "flex";
}

function fecharModalAgendamentoManual() { document.getElementById("modal-agendamento-manual").style.display = "none"; }

async function salvarAgendamentoManual() {
    const isEncaixe = document.getElementById("manual-encaixe").checked;
    const nomeCliente = document.getElementById("manual-cliente").value || "Balcão";
    const telCliente = document.getElementById("manual-telefone").value.replace(/\D/g, "");
    const servicoNome = document.getElementById("manual-servico").value || "Serviço Adicional";
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
    mostrarAlerta(modoMensalistaAtivo ? "Mensalista criado com sucesso para as próximas semanas!" : "Agendamento gravado com sucesso!");
}

// ==========================================
// RESUMO FINANCEIRO (ADMIN & PROFISSIONAL)
// ==========================================
async function atualizarFinanceiroAdmin() {
    const filtro = document.getElementById("filtro-financeiro-admin").value;
    const { data: ags } = await _supabase.from("saas_agendamentos").select("*").eq("status", "concluido");
    
    let totalGeral = 0, pix = 0, dinheiro = 0, debito = 0, credito = 0;
    (ags || []).forEach(ag => {
        if (validarFiltroData(ag.data, filtro)) {
            const val = parseFloat(ag.preco_total) || 0;
            totalGeral += val;
            const pag = (ag.forma_pagamento || 'Pix').toLowerCase();
            if (pag.includes('dinheiro')) dinheiro += val;
            else if (pag.includes('débito') || pag.includes('debito')) debito += val;
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
    (ags || []).forEach(ag => { if (validarFiltroData(ag.data, filtro)) total += parseFloat(ag.preco_total) || 0; });
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
    if (filtro === 'mes') return dataAg.getMonth() === agora.getMonth() && dataAg.getFullYear() === agora.getFullYear();
    return false;
}

async function carregarAtendimentosAdminSemanal() {
    const container = document.getElementById("lista-atendimentos-admin");
    container.innerHTML = "<span style='font-size:0.8rem; color:#AAA;'>A carregar...</span>";

    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const diff = (hoje.getDay() === 0 ? -6 : 1) - hoje.getDay() + (offsetSemanaAdmin * 7);
    const segunda = new Date(hoje); segunda.setDate(hoje.getDate() + diff);
    const sabado = new Date(segunda); sabado.setDate(segunda.getDate() + 5);

    document.getElementById("label-periodo-admin").textContent = `${segunda.toLocaleDateString("pt-BR", {day:'2-digit', month:'2-digit'})} até ${sabado.toLocaleDateString("pt-BR", {day:'2-digit', month:'2-digit'})}`;

    const { data: ags } = await _supabase.from("saas_agendamentos").select("*").gte("data", segunda.toISOString().split("T")[0]).lte("data", sabado.toISOString().split("T")[0]).neq("status", "cancelado").order('data', { ascending: true });

    if (!ags || ags.length === 0) { container.innerHTML = `<span style="font-size: 0.8rem; color: #777;">Sem agendamentos nesta semana.</span>`; return; }

    container.innerHTML = "";
    ags.forEach(a => {
        let iconePag = "💠";
        const pag = (a.forma_pagamento || 'Pix').toLowerCase();
        if (pag.includes('dinheiro')) iconePag = "💵";
        else if (pag.includes('débito') || pag.includes('crédito')) iconePag = "💳";

        container.innerHTML += `
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color:var(--text-color);">${a.data.split('-').reverse().join('/')} às ${a.horario.substring(0,5)}</strong><br>
                    <span style="color:#CCC;">👤 ${a.cliente} (${a.servico})</span><br>
                    <span style="color: var(--primary-color);">👨‍💼 <strong>${a.barbeiro}</strong></span>
                </div>
                <div style="text-align: right;">
                    <strong style="color: #25D366; font-size:1.1rem;">R$ ${(parseFloat(a.preco_total)||0).toFixed(2).replace('.',',')}</strong><br>
                    <span style="font-size: 0.75rem; color: #AAA;">${iconePag} ${a.forma_pagamento || 'Pix'}</span>
                </div>
            </div>`;
    });
}

// ==========================================
// CONFIGURAÇÕES DO ADMIN (MANTIDO 100%)
// ==========================================
function abrirConfiguracoesAdmin() { document.getElementById("modal-config-admin").style.display = "flex"; }
function fecharConfiguracoesAdmin() { document.getElementById("modal-config-admin").style.display = "none"; }

function renderizarAdminParametros() {
    document.getElementById("config-nome-empresa").value = tenantConfig.nome_empresa || "";
    document.getElementById("config-cor-primaria").value = tenantConfig.cor_primaria || "#FF6600";
    renderListasConfig();
}

function renderListasConfig() {
    const listP = document.getElementById("lista-profissionais-config");
    listP.innerHTML = "";
    (tenantConfig.barbeiros || []).forEach((p, i) => {
        let nomeP = typeof p === 'object' ? p.nome : p;
        listP.innerHTML += `<div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
            <span><strong>${nomeP}</strong></span><button style="color:#e74c3c; background:none; border:none; cursor:pointer;" onclick="removerProfissional(${i})"><i class="fa-solid fa-trash"></i></button></div>`;
    });

    const listS = document.getElementById("lista-servicos-config");
    listS.innerHTML = "";
    Object.keys(tenantConfig.servicos).forEach(nome => {
        const s = tenantConfig.servicos[nome];
        listS.innerHTML += `<div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; display:flex; justify-content:space-between; font-size:0.85rem; align-items:center;">
            <span>${nome} <strong style="color:var(--primary-color);">R$ ${s.price}</strong> (${s.duration}m)</span><button style="color:#e74c3c; background:none; border:none; cursor:pointer;" onclick="removerServico('${nome}')"><i class="fa-solid fa-trash"></i></button></div>`;
    });
}

function adicionarProfissional() {
    const nomeVal = document.getElementById("novo-profissional-nome").value.trim();
    if (nomeVal) {
        tenantConfig.barbeiros.push({ nome: nomeVal });
        document.getElementById("novo-profissional-nome").value = "";
        renderListasConfig();
    }
}
function removerProfissional(i) { tenantConfig.barbeiros.splice(i, 1); renderListasConfig(); }

function adicionarServico() {
    const nome = document.getElementById("novo-servico-nome").value.trim();
    const p = parseFloat(document.getElementById("novo-servico-preco").value);
    const d = parseInt(document.getElementById("novo-servico-tempo").value);
    if (nome && p && d) { tenantConfig.servicos[nome] = { price: p, duration: d }; renderListasConfig(); }
}
function removerServico(nome) { delete tenantConfig.servicos[nome]; renderListasConfig(); }

async function salvarConfiguracoesGerais() {
    tenantConfig.nome_empresa = document.getElementById("config-nome-empresa").value.trim();
    tenantConfig.cor_primaria = document.getElementById("config-cor-primaria").value;

    const { error } = await _supabase.from("saas_estabelecimentos").upsert({
        slug: TENANT_ATIVO,
        nome_empresa: tenantConfig.nome_empresa,
        cor_primaria: tenantConfig.cor_primaria,
        barbeiros: tenantConfig.barbeiros,
        servicos: tenantConfig.servicos
    }, { onConflict: 'slug' });

    if (!error) {
        mostrarAlerta("Configurações atualizadas!");
        aplicarIdentidadeVisual(tenantConfig);
        document.getElementById("painel-nome-negocio").textContent = tenantConfig.nome_empresa;
        fecharConfiguracoesAdmin();
    } else {
        mostrarAlerta("Erro ao gravar as configurações.");
    }
}
