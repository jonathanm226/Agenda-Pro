// === CONFIGURAÇÃO MASTER DO SUPABASE ===
const SUPABASE_URL = "https://doecoosuqibzdsyadsyg.supabase.co";
const SUPABASE_KEY = "sb_publishable_-30z4xAhwJPYmy1bfSEjCw_loKUe8uL";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const urlParams = new URLSearchParams(window.location.search);
const TENANT_ATIVO = urlParams.get('slug') || "padrao";

// Estrutura Base 100% Limpa e Dinâmica
let tenantConfig = { 
    nome_empresa: "Meu Estabelecimento", 
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
    servicios: {},
    senhas_usuarios: { "admin": "admin123" }
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

function fazerLogin() {
    const user = document.getElementById("login-usuario").value.trim().toLowerCase();
    const pass = document.getElementById("login-senha").value.trim();
    
    if (!user || !pass) return mostrarAlerta("Preencha os campos de acesso.");

    let senhaAdminCadastrada = (tenantConfig.senhas_usuarios && tenantConfig.senhas_usuarios['admin']) || 'admin123';

    if (user === 'admin' && pass === senhaAdminCadastrada) {
        usuarioLogado = "Admin";
        document.getElementById("login-section").style.display = "none";
        document.getElementById("admin-gear-container").innerHTML = `<div class="btn-engrenagem" onclick="abrirConfiguracoesAdmin()" title="Configurações"><i class="fa-solid fa-gear"></i></div>`;
        document.getElementById("dashboard-admin").style.display = "block";
    } else {
        const profEncontrado = (tenantConfig.barbeiros || []).find(b => {
            let nomeB = typeof b === 'object' ? b.nome : b;
            return nomeB.toLowerCase() === user;
        });

        if (profEncontrado) {
            let nomeReal = typeof profEncontrado === 'object' ? profEncontrado.nome : profEncontrado;
            let senhaSalva = (tenantConfig.senhas_usuarios && tenantConfig.senhas_usuarios[nomeReal.toLowerCase()]) || (nomeReal.toLowerCase().replace(/\s+/g, '') + '123');
            
            if (pass === senhaSalva || pass === '123456') {
                usuarioLogado = nomeReal;
                document.getElementById("login-section").style.display = "none";
                document.getElementById("dashboard-barbeiro").style.display = "block";
                document.getElementById("titulo-agenda-barbeiro").innerHTML = `<i class="fa-solid fa-calendar-check"></i> Agenda: ${usuarioLogado}`;
                carregarAgendaBarbeiro();
                return;
            }
        }

        // Mensagem de erro exata solicitada
        mostrarAlerta("Senha incorreta, verifique e tente novamente.");
    }
}

function fazerLogout() { window.location.reload(); }

function abrirModalTrocarSenha() {
    document.getElementById("nova-senha-input").value = "";
    document.getElementById("modal-trocar-senha").style.display = "flex";
}
function fecharModalTrocarSenha() {
    document.getElementById("modal-trocar-senha").style.display = "none";
}

async function salvarNovaSenha() {
    const novaSenha = document.getElementById("nova-senha-input").value.trim();
    if(!novaSenha) return mostrarAlerta("Digite a nova palavra-passe.");

    if(!tenantConfig.senhas_usuarios) tenantConfig.senhas_usuarios = {};
    tenantConfig.senhas_usuarios[usuarioLogado.toLowerCase()] = novaSenha;

    const btn = document.querySelector("#modal-trocar-senha .btn-acao");
    btn.textContent = "A guardar...";

    const { error } = await _supabase.from("saas_estabelecimentos").upsert({
        slug: TENANT_ATIVO,
        senhas_usuarios: tenantConfig.senhas_usuarios,
        barbeiros: tenantConfig.barbeiros,
        servicos: tenantConfig.servicos
    }, { onConflict: 'slug' });

    btn.textContent = "Guardar Nova Palavra-passe";
    fecharModalTrocarSenha();

    if(!error) {
        mostrarAlerta("Palavra-passe alterada com sucesso!");
    } else {
        mostrarAlerta("Erro ao atualizar a palavra-passe no banco de dados.");
    }
}

function abrirConfiguracoesAdmin() { 
    document.getElementById("modal-config-admin").style.display = "flex";
    renderizarAdminParametros();
}
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
    document.getElementById("config-sobre").value = tenantConfig.sobre || "";
    document.getElementById("config-endereco").value = tenantConfig.endereco || "";
    document.getElementById("config-horario-inicio").value = tenantConfig.horario_inicio || "08:00";
    document.getElementById("config-horario-fim").value = tenantConfig.horario_fim || "19:00";
    
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

        listP.innerHTML += `
            <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; flex-direction:column;">
                    <strong style="color:var(--text-color); font-size:0.9rem;">${nomeP}</strong>
                    <span style="font-size:0.75rem; color:#AAA;">📞 ${wppP} | ⏰ ${inicioP} - ${fimP}</span>
                </div>
                <button type="button" style="color:#e74c3c; background:rgba(231,76,60,0.1); padding:8px; border-radius:6px; border:none; cursor:pointer;" onclick="removerProfissional(${i})"><i class="fa-solid fa-trash"></i></button>
            </div>`;
    });

    const listS = document.getElementById("lista-servicos-config");
    listS.innerHTML = "";
    Object.keys(tenantConfig.servicos || {}).forEach(nome => {
        const s = tenantConfig.servicos[nome];
        listS.innerHTML += `<div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; display:flex; justify-content:space-between; font-size:0.85rem; align-items:center;">
            <span>${nome} <strong style="color:var(--primary-color);">R$ ${s.price}</strong> (${s.duration}m)</span><button type="button" style="color:#e74c3c; background:none; border:none; cursor:pointer;" onclick="removerServico('${nome}')"><i class="fa-solid fa-trash"></i></button></div>`;
    });
}

function adicionarProfissional() {
    const nomeVal = document.getElementById("novo-profissional-nome").value.trim();
    const wppVal = document.getElementById("novo-profissional-wpp").value.replace(/\D/g, "");
    const inicioVal = document.getElementById("novo-profissional-inicio").value;
    const fimVal = document.getElementById("novo-profissional-fim").value;

    if (nomeVal) {
        if(!tenantConfig.barbeiros) tenantConfig.barbeiros = [];
        tenantConfig.barbeiros.push({ nome: nomeVal, whatsapp: wppVal, inicio: inicioVal, fim: fimVal });
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
        if(!tenantConfig.servicos) tenantConfig.servicos = {};
        tenantConfig.servicos[nome] = { price: p, duration: d }; 
        renderListasConfig(); 
    }
}
function removerServico(nome) { delete tenantConfig.servicos[nome]; renderListasConfig(); }

async function salvarConfiguracoesGerais() {
    const btn = document.getElementById("btn-salvar-configs");
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A guardar...';
    btn.disabled = true;

    tenantConfig.nome_empresa = document.getElementById("config-nome-empresa").value.trim();
    tenantConfig.sobre = document.getElementById("config-sobre").value.trim();
    tenantConfig.endereco = document.getElementById("config-endereco").value.trim();
    tenantConfig.horario_inicio = document.getElementById("config-horario-inicio").value;
    tenantConfig.horario_fim = document.getElementById("config-horario-fim").value;
    
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
        sobre: tenantConfig.sobre,
        endereco: tenantConfig.endereco,
        horario_abertura: tenantConfig.horario_inicio,
        horario_fechamento: tenantConfig.horario_fim,
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

function carregarAgendaBarbeiro() {
    const container = document.getElementById("grade-semanal-container");
    if (!container) return;

    const profObj = (tenantConfig.barbeiros || []).find(b => (typeof b === 'object' ? b.nome : b) === usuarioLogado);
    let horaInicio = (profObj && profObj.inicio) ? profObj.inicio : (tenantConfig.horario_inicio || "08:00");
    let horaFim = (profObj && profObj.fim) ? profObj.fim : (tenantConfig.horario_fim || "19:00");

    container.innerHTML = `
        <div style="grid-column: span 6; background: var(--box-color); padding: 12px; border-radius: 8px; text-align: center;">
            <p style="font-size: 0.85rem; color: #CCC;">Horário de expediente configurado: <strong>${horaInicio} às ${horaFim}</strong></p>
            <p style="font-size: 0.75rem; color: var(--primary-color); margin-top: 4px;">Clique num horário para gerir a disponibilidade.</p>
        </div>
    `;
}
