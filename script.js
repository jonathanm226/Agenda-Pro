// === CONFIGURAÇÃO MASTER DO SUPABASE ===
const SUPABASE_URL = "https://doecoosuqibzdsyadsyg.supabase.co";
const SUPABASE_KEY = "sb_publishable_-30z4xAhwJPYmy1bfSEjCw_loKUe8uL";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const urlParams = new URLSearchParams(window.location.search);
const TENANT_ATIVO = urlParams.get('slug') || "padrao";

// Estrutura Base
let tenantConfig = { 
    nome_empresa: "Meu Negócio", 
    logo_url: "", 
    cor_primaria: "#FF6600", cor_fundo: "#121212", cor_caixas: "#1A1A1A", cor_letras: "#FFFFFF",
    barbeiros: [{nome: "Willian", whatsapp: "31999999999"}], 
    servicos: { "Corte de Cabelo": { price: 45, duration: 40 } }
};

let usuarioLogado = "";
let offsetSemana = 0;
let offsetSemanaAdmin = 0;
let idAtendimentoAtivo = null;

document.addEventListener("DOMContentLoaded", async () => {
    await carregarTenantConfig();
    aplicarIdentidadeVisual(tenantConfig);
    
    if (document.getElementById("painel-container")) {
        const logo = document.getElementById("painel-logo");
        if(logo && tenantConfig.logo_url) { logo.src = tenantConfig.logo_url; logo.style.display = "block"; }
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
    if (modalCustom) { document.getElementById("alerta-custom-texto").textContent = texto; modalCustom.style.display = "flex"; } 
    else { alert(texto); }
}
function fecharAlertaCustom() {
    const modalCustom = document.getElementById("modal-alerta-custom");
    if(modalCustom) modalCustom.style.display = "none";
}

// ==========================================
// CONTROLADOR DE ABAS DO MODAL DE CONFIGURAÇÕES
// ==========================================
function mudarTabConfig(tabName, btnElement) {
    document.querySelectorAll('.config-tab-content').forEach(el => el.style.display = 'none');
    document.getElementById(`tab-${tabName}`).style.display = 'block';

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.style.background = 'transparent';
        btn.style.color = '#AAA';
    });
    btnElement.style.background = 'var(--primary-color)';
    btnElement.style.color = '#FFF';
}

// ==========================================
// PAINEL DE GESTÃO - LOGIN DINÂMICO
// ==========================================
function fazerLogin() {
    const user = document.getElementById("login-usuario").value.trim().toLowerCase();
    const pass = document.getElementById("login-senha").value.trim();
    
    if (!user || !pass) return mostrarAlerta("Preencha os campos de acesso.");

    if (user === 'admin' && pass === 'admin123') {
        usuarioLogado = "Admin";
        document.getElementById("login-section").style.display = "none";
        document.getElementById("admin-gear-container").innerHTML = `<div class="btn-engrenagem" onclick="abrirConfiguracoesAdmin()" title="Configurações"><i class="fa-solid fa-gear"></i></div>`;
        document.getElementById("dashboard-admin").style.display = "block";
        renderizarAdminParametros();
    } else {
        const profEncontrado = (tenantConfig.barbeiros || []).find(b => {
            let nomeB = typeof b === 'object' ? b.nome : b;
            return nomeB.toLowerCase() === user;
        });

        if (profEncontrado) {
            let nomeReal = typeof profEncontrado === 'object' ? profEncontrado.nome : profEncontrado;
            let expectedPass = nomeReal.toLowerCase().replace(/\s+/g, '') + '123';
            
            if (pass === expectedPass || pass === '123456') {
                usuarioLogado = nomeReal;
                document.getElementById("login-section").style.display = "none";
                document.getElementById("dashboard-barbeiro").style.display = "block";
                document.getElementById("titulo-agenda-barbeiro").innerHTML = `<i class="fa-solid fa-calendar-check"></i> Agenda: ${usuarioLogado}`;
                return;
            }
        }

        mostrarAlerta("Credenciais de acesso inválidas. Dica: A palavra-passe é o seu nome junto de 123.");
    }
}
function fazerLogout() { window.location.reload(); }

// ==========================================
// CONFIGURAÇÕES DO ADMIN
// ==========================================
function abrirConfiguracoesAdmin() { document.getElementById("modal-config-admin").style.display = "flex"; }
function fecharConfiguracoesAdmin() { document.getElementById("modal-config-admin").style.display = "none"; }

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
        listP.innerHTML += `
            <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; flex-direction:column;">
                    <strong style="color:var(--text-color); font-size:0.9rem;">${nomeP}</strong>
                    <span style="font-size:0.75rem; color:#AAA;">📞 ${wppP}</span>
                </div>
                <button type="button" style="color:#e74c3c; background:rgba(231,76,60,0.1); padding:8px; border-radius:6px; border:none; cursor:pointer;" onclick="removerProfissional(${i})"><i class="fa-solid fa-trash"></i></button>
            </div>`;
    });

    const listS = document.getElementById("lista-servicos-config");
    listS.innerHTML = "";
    Object.keys(tenantConfig.servicos).forEach(nome => {
        const s = tenantConfig.servicos[nome];
        listS.innerHTML += `<div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; display:flex; justify-content:space-between; font-size:0.85rem; align-items:center;">
            <span>${nome} <strong style="color:var(--primary-color);">R$ ${s.price}</strong> (${s.duration}m)</span><button type="button" style="color:#e74c3c; background:none; border:none; cursor:pointer;" onclick="removerServico('${nome}')"><i class="fa-solid fa-trash"></i></button></div>`;
    });
}

function adicionarProfissional() {
    const nomeVal = document.getElementById("novo-profissional-nome").value.trim();
    const wppVal = document.getElementById("novo-profissional-wpp").value.replace(/\D/g, "");
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
    if (nome && p && d) { tenantConfig.servicos[nome] = { price: p, duration: d }; renderListasConfig(); }
}
function removerServico(nome) { delete tenantConfig.servicos[nome]; renderListasConfig(); }

async function salvarConfiguracoesGerais() {
    const btn = document.getElementById("btn-salvar-configs");
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A guardar...';
    btn.disabled = true;

    tenantConfig.nome_empresa = document.getElementById("config-nome-empresa").value.trim();
    tenantConfig.cor_primaria = document.getElementById("config-cor-primaria").value;
    tenantConfig.cor_fundo = document.getElementById("config-cor-fundo").value || "#121212";
    tenantConfig.cor_caixas = document.getElementById("config-cor-caixas").value || "#1A1A1A";
    tenantConfig.cor_letras = document.getElementById("config-cor-letras").value || "#FFFFFF";

    const logoFile = document.getElementById("config-logo-file").files[0];
    if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${TENANT_ATIVO}_logo_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await _supabase.storage.from('Logos').upload(fileName, logoFile, { upsert: true });
        
        if (!uploadError) {
            const { data } = _supabase.storage.from('Logos').getPublicUrl(fileName);
            tenantConfig.logo_url = data.publicUrl;
        }
    }

    const { error } = await _supabase.from("saas_estabelecimentos").upsert({
        slug: TENANT_ATIVO,
        nome_empresa: tenantConfig.nome_empresa,
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
        document.getElementById("painel-nome-negocio").textContent = tenantConfig.nome_empresa;
        fecharConfiguracoesAdmin();
    } else {
        mostrarAlerta("Erro ao gravar as configurações.");
    }
}
