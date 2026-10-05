// === CONFIGURAÇÃO DO SUPABASE ===
const SUPABASE_URL = "https://doecoosuqibzdsyadsyg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvZWNvb3N1cWliemRzeWFkc3lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MjQwMDAsImV4cCI6MjEwNTUwMDAwMH0.M2-NrLZQv-DqTtsIp4DbFHzgTjUENCA5X1ZPdDlmhPQ";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// CORREÇÃO AQUI: O barbeiro inicial deve ser o Lucas, pois é ele que tem a class="active" no HTML
let selectedBarber = "Lucas"; 
let selectedServices = []; 

document.addEventListener("DOMContentLoaded", () => {
    const dateInput = document.getElementById("date");
    if (dateInput) {
        // Define a data de hoje como valor inicial
        const today = new Date().toISOString().split("T")[0];
        dateInput.value = today;
        
        // Define a data mínima como hoje (para evitar agendamentos no passado)
        dateInput.min = today;
        
        dateInput.addEventListener("change", checkAvailableTimes);
    }
    checkAvailableTimes();
});

function selectBarber(element, barberName) {
    document.querySelectorAll(".barber-card").forEach(card => card.classList.remove("active"));
    element.classList.add("active");
    selectedBarber = barberName;
    
    // Atualiza os horários disponíveis ao mudar de barbeiro
    checkAvailableTimes();
}

function toggleService(element, serviceName, price) {
    const icon = element.querySelector(".checkbox-icon");
    const index = selectedServices.findIndex(s => s.name === serviceName);

    if (index > -1) {
        selectedServices.splice(index, 1);
        element.classList.remove("active");
        if (icon) {
            icon.classList.remove("fa-solid", "fa-square-check");
            icon.classList.add("fa-regular", "fa-square");
        }
    } else {
        selectedServices.push({ name: serviceName, price: price });
        element.classList.add("active");
        if (icon) {
            icon.classList.remove("fa-regular", "fa-square");
            icon.classList.add("fa-solid", "fa-square-check");
        }
    }
}

function getTimesForDate(dateString) {
    if (!dateString) return [];
    
    const partes = dateString.split('-');
    const dataObj = new Date(partes[0], partes[1] - 1, partes[2]);
    const diaSemana = dataObj.getDay();

    let horarios = [];

    if (diaSemana === 0) {
        return []; // Domingo Fechado
    } else if (diaSemana === 6) {
        for (let h = 8; h <= 16; h++) {
            horarios.push(h < 10 ? `0${h}:00` : `${h}:00`);
            horarios.push(h < 10 ? `0${h}:30` : `${h}:30`); // Adicionado horários de 30 em 30 min se necessário
        }
    } else {
        for (let h = 8; h <= 20; h++) {
            horarios.push(h < 10 ? `0${h}:00` : `${h}:00`);
            horarios.push(h < 10 ? `0${h}:30` : `${h}:30`);
        }
    }

    return horarios;
}

async function checkAvailableTimes() {
    const dateElement = document.getElementById("date");
    const timeSelect = document.getElementById("time");

    if (!dateElement || !timeSelect) return;

    const selectedDate = dateElement.value;
    if (!selectedDate) return;

    const allTimes = getTimesForDate(selectedDate);
    timeSelect.innerHTML = "";

    if (allTimes.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Fechado neste dia";
        option.disabled = true;
        timeSelect.appendChild(option);
        return;
    }

    // Adiciona a opção de carregamento
    const optionLoading = document.createElement("option");
    optionLoading.value = "";
    optionLoading.textContent = "A carregar...";
    optionLoading.disabled = true;
    timeSelect.appendChild(optionLoading);

    try {
        // CORREÇÃO: No projeto Prime (painel_2), a tabela chama-se "agendamentos" e a coluna é "barbeiro", e não "agendamento" / "profissional"
        const { data: agendamentos, error } = await _supabase
            .from("agendamentos")
            .select("horario")
            .eq("barbeiro", selectedBarber)
            .eq("data", selectedDate)
            .neq("status", "cancelado"); // Ignora os cancelados para libertar o horário

        if (error) {
            console.error("Erro Supabase:", error);
            // Se der erro por a tabela não existir, tentamos o formato antigo como fallback
            try {
                const fallback = await _supabase.from("agendamento").select("horario").eq("profissional", selectedBarber).eq("data", selectedDate);
                agendamentos = fallback.data || [];
            } catch(e) {}
        }

        const occupiedTimes = (agendamentos || []).map(a => a.horario);
        
        timeSelect.innerHTML = "";

        allTimes.forEach(time => {
            const option = document.createElement("option");
            option.value = time;

            if (occupiedTimes.includes(time)) {
                option.textContent = `${time} - (Indisponível)`;
                option.disabled = true;
            } else {
                option.textContent = time;
            }

            timeSelect.appendChild(option);
        });
    } catch (err) {
        console.error("Erro ao buscar agendamentos:", err);
        timeSelect.innerHTML = "<option disabled>Erro ao carregar horários</option>";
    }
}

async function sendToWhatsapp() {
    const nameInput = document.getElementById("client-name");
    const phoneInput = document.getElementById("client-phone");
    const dateInput = document.getElementById("date");
    const timeSelect = document.getElementById("time");
    const btnAgendar = document.getElementById("btn-agendar");

    const name = nameInput ? nameInput.value.trim() : "";
    const phone = phoneInput ? phoneInput.value.trim() : "";
    const date = dateInput ? dateInput.value : "";
    const time = timeSelect ? timeSelect.value : "";

    if (!name || !phone) {
        alert("Por favor, digite o seu nome e WhatsApp antes de prosseguir.");
        return;
    }

    if (selectedServices.length === 0) {
        alert("Por favor, selecione pelo menos um serviço.");
        return;
    }

    if (!time || timeSelect.selectedOptions[0]?.disabled) {
        alert("Por favor, selecione um horário válido e disponível.");
        return;
    }

    if (btnAgendar) {
        btnAgendar.disabled = true;
        btnAgendar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A agendar...';
    }

    let precoTotal = 0;
    let listaNomesServicos = selectedServices.map(s => {
        precoTotal += s.price;
        return s.name;
    }).join(", ");

    const formattedDate = date.split("-").reverse().join("/");
    const whatsappNumber = "31994951564";

    const message = `Olá! Gostaria de confirmar o meu agendamento na Barbearia Prime:\n\n` +
                    `👤 *Cliente:* ${name}\n` +
                    `📱 *Telefone:* ${phone}\n` +
                    `💈 *Barbeiro:* ${selectedBarber}\n` +
                    `✂️ *Serviços:* ${listaNomesServicos} (Total: R$ ${precoTotal},00)\n` +
                    `📅 *Data:* ${formattedDate}\n` +
                    `⏰ *Horário:* ${time}`;

    const link = `https://wa.me/55${whatsappNumber}?text=${encodeURIComponent(message)}`;

    try {
        // CORREÇÃO: Utiliza a tabela 'agendamentos' para bater certo com o painel_2.html
        const { error } = await _supabase
            .from("agendamentos")
            .insert([
                {
                    cliente: name,
                    telefone: phone,
                    barbeiro: selectedBarber,
                    servico: listaNomesServicos,
                    preco_total: precoTotal,
                    data: date,
                    horario: time,
                    status: 'ativo'
                }
            ]);

        if (error) {
            console.error("Erro no Supabase:", error);
            // Tenta a tabela antiga caso o banco não tenha sido atualizado
            await _supabase.from("agendamento").insert([{ cliente: name, telefone: phone, profissional: selectedBarber, servico: listaNomesServicos, data: date, horario: time }]);
        }
    } catch (err) {
        console.error(err);
    }

    await checkAvailableTimes();

    if (btnAgendar) {
        btnAgendar.disabled = false;
        btnAgendar.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Agendar pelo WhatsApp';
    }

    window.location.href = link;
}
