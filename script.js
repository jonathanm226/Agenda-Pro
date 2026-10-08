// === CONFIGURAÇÃO MASTER DO SUPABASE ===
const SUPABASE_URL = "https://doecoosuqibzdsyadsyg.supabase.co";
const SUPABASE_KEY = "sb_publishable_-30z4xAhwJPYmy1bfSEjCw_loKUe8uL";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const urlParams = new URLSearchParams(window.location.search);
const TENANT_ATIVO = urlParams.get('slug') || "padrao";

let tenantConfig = { 
    nome_empresa: "Meu Negócio", 
    slogan: "Gestão inteligente", 
    logo_url: "", 
    cor_primaria: "#FF6600",
    cor_fundo: "#121212",
    cor_caixas: "#1A1A1A",
    cor_letras: "#FFFFFF",
    barbeiros: [], 
    servicos: {} 
};

let usuarioLogado = "";
let offsetSemana = 0;
let idAtendimentoAtivo = null;
let atendimentoDetalheAtual = null;

let selectedBarber = "";
let selectedServices = [];

document.addEventListener("DOMContentLoaded", async () => {
    await carregarTenantConfig();
    aplicarIdentidadeVisual(tenantConfig);
    if (document.getElementById("agendar-container")) initAgendar();
    if (document.getElementById("painel-container")) {
        document.getElementById("painel-nome-negocio").textContent = tenantConfig.nome_empresa;
    }
});

async function carregarTenantConfig() {
    try {
        const { data } = await _supabase.from("saas_estabelecimentos").select("*").eq("slug", TENANT_ATIVO).single();
        if (data) Object.assign(tenantConfig, data);
    } catch (e) { console.warn("Usando config padrão."); }
}

function aplicarIdentidadeVisual(config) {
    const root = document.documentElement;
    if(config.cor_primaria) root.style.setProperty('--primary-color', config.cor_primaria);
    if(config.cor_fundo) root.style.setProperty('--bg-color', config.cor_fundo);
    if(config.cor_caixas) root.style.setProperty('--box-color', config.cor_caixas);
    if(config.cor_letras) root.style.setProperty('--text-color', config.cor_letras);
    
    const logos = document.querySelectorAll("img[alt='Logo']");
    logos.forEach(img => { 
        if (config.logo_url) { img.src = config.logo_url; img.style.display = "block"; } 
        else { img.style.display = "none"; }
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
    document.getElementById("modal-alerta-custom").style.display = "none";
}

// ==========================================
// CLIENTE (AGENDAR.HTML)
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
                <h3 style="font-size: 0.9rem; margin:0;">${nomeB}</h3>
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
        <div style="margin-bottom: 6px;"><i class="fa-regular fa-calendar" style="color:var(--primary-color);"></i> <strong>Data:</strong> ${dataFormatada} às ${timeSel.value}</div>
        <div style="margin-bottom: 6px;"><i class="fa-solid fa-user-tie" style="color:var(--primary-color);"></i> <strong>Profissional:</strong> ${selectedBarber}</div>
        <div style="margin-bottom: 6px;"><i class="fa-solid fa-scissors" style="color:var(--primary-color);"></i> <strong>Serviços:</strong> ${selectedServices.map(s => s.name).join(", ")}</div>
        <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 1.2rem; color: #25D366; text-align: center;">
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
        
        // Número Piloto
        const wppPiloto = "5531994951564";
        const dataFormatada = dataAg.split("-").reverse().join("/");
        const msg = `✅ *NOVO AGENDAMENTO CONFIRMADO!* ✅%0A%0AOlá! Segue a confirmação do meu horário na *${tenantConfig.nome_empresa}*:%0A%0A👤 *Cliente:* ${nome}%0A📞 *WhatsApp:* ${wpp}%0A✂️ *Serviços:* ${servNames}%0A👨‍💼 *Profissional:* ${selectedBarber}%0A📅 *Data:* ${dataFormatada} às ${horaAg}%0A💰 *Valor Estimado:* R$ ${totalP.toFixed(2).replace('.', ',')}`;

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
// PAINEL (CÁLCULO DINÂMICO EXTRAS)
// ==========================================
// ... (lógica de login/grade semanal omitida por brevidade - usa o padrão já enviado) ...

async function abrirAtendimento(id) {
    idAtendimentoAtivo = id;
    const { data } = await _supabase.from("saas_agendamentos").select("*").eq("id", id).single();
    if (!data) return;
    atendimentoDetalheAtual = data;
    const precoOriginal = parseFloat(data.preco_total) || 35;

    document.getElementById("action-modal-details").innerHTML = `
        <div style="margin-bottom:5px;"><strong>Cliente:</strong> ${data.cliente}</div>
        <div style="margin-bottom:5px;"><strong>Serviço:</strong> ${data.servico}</div>
        <div style="margin-bottom:5px;"><strong>Data/Hora:</strong> ${data.data.split('-').reverse().join('/')} às ${data.horario.substring(0,5)}</div>
        <div style="margin-bottom:5px; color: #25D366;"><strong>Valor Base:</strong> R$ ${precoOriginal.toFixed(2).replace('.', ',')}</div>
    `;
    
    document.getElementById("secao-conclusao-pagamento").style.display = "none";
    document.getElementById("secao-botoes-principais").style.display = "flex";

    // Preenche serviços extras para cálculo dinâmico
    const containerExtras = document.getElementById("extras-servicos-container");
    containerExtras.innerHTML = "";
    Object.keys(tenantConfig.servicos).forEach(serv => {
        const precoServ = tenantConfig.servicos[serv].price;
        containerExtras.innerHTML += `
            <label style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:8px; border-radius:6px; cursor:pointer;">
                <span><input type="checkbox" class="chk-extra" value="${serv}" data-preco="${precoServ}" style="width:auto; margin-right:6px;" onchange="recalcularTotalDinamico(${precoOriginal})"> ${serv}</span>
                <span style="color:#CCC; font-size:0.8rem;">+ R$ ${precoServ.toFixed(2).replace('.',',')}</span>
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

function mostrarSecaoConclusao() {
    document.getElementById("secao-botoes-principais").style.display = "none";
    document.getElementById("secao-conclusao-pagamento").style.display = "block";
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

function fecharModalAtendimento() { document.getElementById("custom-action-modal").style.display = "none"; }
