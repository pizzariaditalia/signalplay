// ============================================================================
// 🔥 INICIALIZAÇÃO DO FIREBASE
// ============================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBSYJYEFLlDwBYsQC0I76n9NfAph2oWuLI",
    authDomain: "signalplay-tv.firebaseapp.com",
    projectId: "signalplay-tv",
    storageBucket: "signalplay-tv.firebasestorage.app",
    messagingSenderId: "51000338902",
    appId: "1:51000338902:web:61d77a44dd62c0353a1c77"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let servidoresMap = {}; 
let servidoresDadosGlobais = {}; 
let clientesGlobaisCache = []; 
let bloqueiosGlobais = { canais: [], filmes: [], series: [] };
let pastasRenderizadasComSucesso = false; // 🛡️ TRAVA ANTI-APAGÃO

document.addEventListener('DOMContentLoaded', () => { 
    try {
        carregarServidores(true); 
    } catch (e) {
        console.error("Erro na inicialização:", e);
    }
});

function mudarAbaAdm(aba) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navAba = document.getElementById('nav-' + aba);
    if(navAba) navAba.classList.add('active');
    
    document.querySelectorAll('.view-adm').forEach(el => el.classList.add('escondido'));
    const secAba = document.getElementById('sec-' + aba);
    if(secAba) secAba.classList.remove('escondido');
    
    if(aba === 'clientes') carregarClientes();
    if(aba === 'servidores') carregarServidores();
    if(aba === 'relatorios') gerarRelatorios();
}

// ============================================================================
// 📊 RELATÓRIOS E FINANCEIRO
// ============================================================================
function gerarRelatorios() {
    try {
        const inputTicket = document.getElementById('ticket-medio');
        const ticketMedio = inputTicket ? (parseFloat(inputTicket.value) || 0) : 35;
        let total = clientesGlobaisCache.length; let ativos = 0; let inativos = 0; let testes = 0;
        
        let hoje = new Date(); 
        let agoraMs = hoje.getTime(); 
        
        const tbodyRetencao = document.getElementById('lista-retencao-body');
        if(!tbodyRetencao) return;
        
        tbodyRetencao.innerHTML = ""; 
        let vencendoHTML = "";

        clientesGlobaisCache.forEach(c => {
            let dataVencimento = null; let diasRestantes = 999;
            if (c.vencimento) {
                dataVencimento = new Date(c.vencimento + "T23:59:59");
                diasRestantes = Math.ceil((dataVencimento.getTime() - agoraMs) / (1000 * 3600 * 24));
            }
            let statusReal = c.status;
            if (dataVencimento && diasRestantes < 0 && (statusReal === 'ativo' || statusReal === 'teste')) { statusReal = 'inativo'; }
            if (statusReal === 'ativo') ativos++; else if (statusReal === 'teste') testes++; else inativos++;

            if (dataVencimento && diasRestantes >= 0 && diasRestantes <= 5) {
                let classeVencimento = diasRestantes === 0 ? 'color: var(--danger); font-weight: 800;' : 'color: #ff9f43;';
                let textoDias = diasRestantes === 0 ? 'Vence HOJE!' : `Em ${diasRestantes} dias`;
                vencendoHTML += `<tr><td data-label="Usuário"><i class="fa-solid fa-user" style="color:var(--accent-yellow); margin-right:8px;"></i> <strong>${c.usuario}</strong></td><td data-label="Contato"><span style="color:var(--text-muted); font-size:0.8rem;">(WhatsApp API)</span></td><td data-label="Vencimento" style="${classeVencimento}">${dataVencimento.toLocaleDateString('pt-BR')} (${textoDias})</td><td data-label="Status"><span class="badge ${c.status === 'teste' ? 'teste' : 'vencendo'}">${c.status}</span></td></tr>`;
            }
        });

        if (vencendoHTML === "") { tbodyRetencao.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--success); padding: 30px;"><i class="fa-solid fa-face-smile"></i> Nenhum cliente prestes a vencer. A base está saudável!</td></tr>`; } 
        else { tbodyRetencao.innerHTML = vencendoHTML; }

        let mrr = ativos * ticketMedio;
        if(document.getElementById('stat-total')) document.getElementById('stat-total').innerText = total; 
        if(document.getElementById('stat-ativos')) document.getElementById('stat-ativos').innerText = ativos;
        if(document.getElementById('stat-inativos')) document.getElementById('stat-inativos').innerText = inativos; 
        if(document.getElementById('stat-testes')) document.getElementById('stat-testes').innerText = testes;
        if(document.getElementById('stat-mrr')) document.getElementById('stat-mrr').innerText = mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } catch(e) {}
}

// ============================================================================
// ⚙️ SERVIDORES 
// ============================================================================
function alternarCamposServidor() {
    const tipo = document.getElementById('servidor-tipo').value;
    const boxCreds = document.getElementById('box-xtream-creds');
    const boxUrl = document.getElementById('box-servidor-url');
    const inputUrl = document.getElementById('servidor-url');
    const labelUrl = document.getElementById('label-servidor-url');

    if (tipo === 'embutido') {
        boxCreds.classList.add('escondido'); boxUrl.classList.add('escondido');
        inputUrl.value = "Local/App";
    } else if (tipo === 'm3u') {
        boxCreds.classList.add('escondido'); boxUrl.classList.remove('escondido');
        labelUrl.innerText = "URL da Lista M3U (http://...)";
        if(inputUrl.value === "Local/App") inputUrl.value = "";
    } else {
        boxCreds.classList.remove('escondido'); boxUrl.classList.remove('escondido');
        labelUrl.innerText = "Host / URL Base (Xtream)";
        if(inputUrl.value === "Local/App") inputUrl.value = "";
    }
}

function carregarServidores(initialLoad = false) {
    db.collection("servidores").orderBy("criadoEm", "desc").onSnapshot((snapshot) => {
        const tbody = document.getElementById('lista-servidores-body');
        const selectCliente = document.getElementById('cliente-servidor');
        
        if(!tbody || !selectCliente) return;

        tbody.innerHTML = ''; selectCliente.innerHTML = '<option value="">-- Selecione um Servidor --</option>'; 
        servidoresMap = {}; servidoresDadosGlobais = {};

        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding: 40px;">Nenhum servidor cadastrado.</td></tr>`;
        } else {
            snapshot.forEach((doc) => {
                const srv = doc.data(); const id = doc.id;
                servidoresMap[id] = srv.nome; 
                servidoresDadosGlobais[id] = srv; 

                let badgeTipo = '';
                if(srv.tipo === 'xtream') badgeTipo = '<span class="badge" style="background:#e67e22; color:#fff; border-color:#d35400;">Xtream</span>';
                else if (srv.tipo === 'm3u') badgeTipo = '<span class="badge" style="background:#8e44ad; color:#fff; border-color:#9b59b6;">M3U</span>';
                else badgeTipo = '<span class="badge" style="background:#27ae60; color:#fff; border-color:#8e44ad;">Local/App</span>';
                
                let linkVisual = srv.url;
                let conexaoTexto = '';
                if(srv.tipo === 'xtream') conexaoTexto = `${linkVisual}<br><span style="font-size:0.75rem; color:var(--text-muted);">User: ${srv.xtream_user}</span>`;
                else if(srv.tipo === 'm3u') conexaoTexto = `<span style="font-size:0.75rem; color:var(--text-muted);">${linkVisual}</span>`;
                else conexaoTexto = `<span style="font-size:0.75rem; color:var(--text-muted);">Arquivos embutidos no código</span>`;
                
                let dataFormatada = "--/--/----"; if(srv.criadoEm) dataFormatada = srv.criadoEm.toDate().toLocaleDateString('pt-BR');

                tbody.innerHTML += `
                    <tr>
                        <td data-label="Nome"><i class="fa-solid fa-server" style="color:var(--accent-yellow); margin-right:8px;"></i> <strong>${srv.nome}</strong></td>
                        <td data-label="Tipo">${badgeTipo}</td>
                        <td data-label="Conexão">${conexaoTexto}</td>
                        <td data-label="Adicionado" style="color:var(--text-muted);">${dataFormatada}</td>
                        <td data-label="Ações" style="text-align: right;">
                            <button class="acao-btn delete" onclick="excluirServidor('${id}', '${srv.nome}')" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>
                        </td>
                    </tr>
                `;
                selectCliente.innerHTML += `<option value="${id}">${srv.nome}</option>`;
            });
        }
        document.getElementById('loading-servidores').classList.add('escondido');
        document.getElementById('tabela-servidores-container').classList.remove('escondido');
        if(initialLoad) carregarClientes(); 
    }, (error) => {});
}

async function salvarServidor() {
    const id = document.getElementById('servidor-id').value; 
    const nome = document.getElementById('servidor-nome').value.trim();
    let url = document.getElementById('servidor-url').value.trim(); 
    let tipo = document.getElementById('servidor-tipo').value;
    const xUser = document.getElementById('servidor-xtream-user').value.trim(); 
    const xPass = document.getElementById('servidor-xtream-pass').value.trim();
    
    if(!nome) return alert("Preencha o Nome de identificação.");

    if (tipo === 'xtream') {
        if(!url) return alert("Preencha a URL do servidor.");
        if(!xUser || !xPass) return alert("Para conexões Xtream, Usuário e Senha são obrigatórios.");
    } else if (tipo === 'm3u') {
        if(!url) return alert("Preencha o Link da Lista M3U.");
    }

    const dados = { nome: nome, url: url, tipo: tipo, xtream_user: tipo === 'xtream' ? xUser : '', xtream_pass: tipo === 'xtream' ? xPass : '' };

    try {
        if (id) { await db.collection("servidores").doc(id).update(dados); } 
        else { dados.criadoEm = firebase.firestore.FieldValue.serverTimestamp(); await db.collection("servidores").add(dados); }
        fecharModalServidor();
    } catch (error) { 
        alert("Erro ao salvar servidor no banco: " + error.message); 
    }
}

async function excluirServidor(id, nome) {
    if(confirm(`Excluir o servidor "${nome}"?\nOs clientes vinculados a ele perderão o acesso.`)) {
        try { await db.collection("servidores").doc(id).delete(); } catch (error) { alert("Erro ao excluir: " + error.message); }
    }
}

function abrirModalServidor() {
    try {
        document.getElementById('modal-titulo-servidor').innerText = "Adicionar Servidor";
        document.getElementById('servidor-id').value = ""; document.getElementById('servidor-nome').value = "";
        document.getElementById('servidor-url').value = ""; document.getElementById('servidor-tipo').value = "xtream";
        document.getElementById('servidor-xtream-user').value = ""; document.getElementById('servidor-xtream-pass').value = "";
        alternarCamposServidor();
        document.getElementById('modal-servidor').classList.add('open');
    } catch(e) {}
}

function fecharModalServidor() { 
    const m = document.getElementById('modal-servidor');
    if(m) m.classList.remove('open'); 
}

// ============================================================================
// 🔌 INTEGRAÇÃO COM API XTREAM CODES (Busca as pastas automaticamente)
// ============================================================================
async function carregarPastasDoServidorSelecionado() {
    const servId = document.getElementById('cliente-servidor').value;
    if (!servId) return alert("Por favor, selecione um Servidor da lista primeiro.");

    const srv = servidoresDadosGlobais[servId];
    if (!srv || srv.tipo !== 'xtream') {
        return alert("A busca automática de pastas só é suportada em servidores do tipo Xtream Codes.");
    }

    const btn = document.getElementById('btn-carregar-pastas');
    const loader = document.getElementById('loader-pastas');
    const boxListas = document.getElementById('box-listas-bloqueio');

    if(btn) btn.style.display = 'none';
    if(loader) loader.style.display = 'block';
    if(boxListas) boxListas.style.display = 'none';

    try {
        const urlBase = srv.url.endsWith('/') ? srv.url.slice(0, -1) : srv.url;
        
        const fetchCategoriaSeguro = async (action) => {
            const targetUrl = `${urlBase}/player_api.php?username=${srv.xtream_user}&password=${srv.xtream_pass}&action=${action}`;
            try {
                let res = await fetch(targetUrl);
                if (res.ok) return await res.json();
            } catch(e) {}
            
            try {
                let proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
                let resProxy = await fetch(proxyUrl);
                let dataProxy = await resProxy.json();
                return JSON.parse(dataProxy.contents);
            } catch(e) {
                return [];
            }
        };

        const liveCats = await fetchCategoriaSeguro('get_live_categories');
        const vodCats = await fetchCategoriaSeguro('get_vod_categories');
        const seriesCats = await fetchCategoriaSeguro('get_series_categories');

        renderizarCheckboxes('check-canais', liveCats, bloqueiosGlobais.canais || []);
        renderizarCheckboxes('check-filmes', vodCats, bloqueiosGlobais.filmes || []);
        renderizarCheckboxes('check-series', seriesCats, bloqueiosGlobais.series || []);

        pastasRenderizadasComSucesso = true; // 🛡️ LIBERA A GRAVAÇÃO DO FIREBASE

        if(loader) loader.style.display = 'none';
        if(btn) {
            btn.style.display = 'block';
            btn.innerHTML = '<i class="fa-solid fa-sync"></i> Recarregar Pastas do Servidor';
        }
        if(boxListas) boxListas.style.display = 'flex';

    } catch (error) {
        pastasRenderizadasComSucesso = false;
        if(loader) loader.style.display = 'none';
        if(btn) btn.style.display = 'block';
        alert("Não foi possível conectar ao servidor Xtream para puxar as pastas.");
    }
}

function renderizarCheckboxes(containerId, categoriasArr, bloqueiosSalvos) {
    const container = document.getElementById(containerId);
    if(!container) return;
    
    container.innerHTML = "";
    
    if (!categoriasArr || categoriasArr.length === 0) {
        container.innerHTML = "<span style='color:var(--text-muted);font-size:0.85rem;'>Nenhuma pasta encontrada.</span>";
        return;
    }

    categoriasArr.sort((a, b) => (a.category_name || "").localeCompare(b.category_name || ""));

    let html = "";
    categoriasArr.forEach(cat => {
        const nomeStr = (cat.category_name || "").toString().trim();
        if (nomeStr.length === 0) return;
        
        // Compara com Trim e Lowercase para evitar bugs de espaço fantasma
        const isChecked = bloqueiosSalvos.some(b => 
            typeof b === 'string' && b.trim().toLowerCase() === nomeStr.toLowerCase()
        ) ? "checked" : "";
        
        html += `
            <label class="checkbox-item">
                <input type="checkbox" value="${nomeStr.replace(/"/g, '&quot;')}" ${isChecked}>
                ${nomeStr}
            </label>
        `;
    });
    container.innerHTML = html;
}

function coletarBloqueiosCheckboxes(containerId) {
    const container = document.getElementById(containerId);
    if(!container) return [];
    const checks = container.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checks).map(c => c.value.trim()); // Remove espaços antes de salvar
}

// ============================================================================
// ⚙️ MÓDULO DE CLIENTES
// ============================================================================
function carregarClientes() {
    db.collection("usuarios").orderBy("criadoEm", "desc").onSnapshot((snapshot) => {
        const tbody = document.getElementById('lista-clientes-body'); 
        if(!tbody) return;
        
        tbody.innerHTML = ''; clientesGlobaisCache = [];

        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding: 40px;">Nenhum cliente cadastrado.</td></tr>`;
        } else {
            snapshot.forEach((doc) => {
                const c = doc.data(); const id = doc.id;
                clientesGlobaisCache.push({...c, id: id}); 

                let textoVencimento = "<span style='color:var(--text-muted); font-size:0.8rem;'>Ilimitado</span>";
                let statusReal = c.status;

                if (c.vencimento) {
                    let dVenc = new Date(c.vencimento + "T23:59:59");
                    let diasRestantes = Math.ceil((dVenc.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                    
                    if (diasRestantes < 0) { statusReal = 'inativo'; textoVencimento = `<span style="color:var(--danger); font-weight:700;">Vencido (${dVenc.toLocaleDateString('pt-BR')})</span>`; } 
                    else if (diasRestantes <= 5) { textoVencimento = `<span style="color:#ff9f43; font-weight:700;">${dVenc.toLocaleDateString('pt-BR')}</span>`; } 
                    else { textoVencimento = dVenc.toLocaleDateString('pt-BR'); }
                }

                let statusBadge = '';
                if (statusReal === 'ativo') statusBadge = '<span class="badge ativo">Ativo</span>';
                else if (statusReal === 'teste') statusBadge = '<span class="badge teste">Teste</span>';
                else if (statusReal === 'pendente_pagamento') statusBadge = '<span class="badge vencendo">Pendente PIX</span>';
                else statusBadge = '<span class="badge inativo">Inativo</span>';
                
                const nomeServidor = servidoresMap[c.servidor_id] || '<span style="color:var(--danger)">Sem Servidor</span>';

                tbody.innerHTML += `
                    <tr>
                        <td data-label="Usuário"><i class="fa-solid fa-user" style="color:var(--accent-yellow); margin-right:8px;"></i> <strong>${c.usuario}</strong></td>
                        <td data-label="Senha">${c.senha}</td>
                        <td data-label="Servidor">${nomeServidor}</td>
                        <td data-label="Status">${statusBadge}</td>
                        <td data-label="Vencimento">${textoVencimento}</td>
                        <td data-label="Ações" style="text-align: right;">
                            <button class="acao-btn edit" onclick="prepararEdicaoCliente('${id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                            <button class="acao-btn delete" onclick="excluirCliente('${id}', '${c.usuario}')" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>
                        </td>
                    </tr>
                `;
            });
        }
        document.getElementById('loading-clientes').classList.add('escondido');
        document.getElementById('tabela-clientes-container').classList.remove('escondido');
        
        if(document.getElementById('sec-relatorios') && !document.getElementById('sec-relatorios').classList.contains('escondido')) { 
            gerarRelatorios(); 
        }
    }, (error) => {});
}

async function salvarCliente() {
    try {
        const id = document.getElementById('cliente-id').value; 
        const usuario = document.getElementById('cliente-usuario').value.trim();
        const senha = document.getElementById('cliente-senha').value.trim(); 
        const status = document.getElementById('cliente-status').value;
        const servidor_id = document.getElementById('cliente-servidor').value; 
        const vencimento = document.getElementById('cliente-vencimento').value;
        const inputTelas = document.getElementById('cliente-telas');
        const telas = inputTelas ? (parseInt(inputTelas.value) || 1) : 1;

        const boxListas = document.getElementById('box-listas-bloqueio');
        
        // 🛡️ MÁGICA: Só pega os dados da checkbox se as pastas realmente carregaram
        if (pastasRenderizadasComSucesso && boxListas && boxListas.style.display !== 'none') {
            bloqueiosGlobais.canais = coletarBloqueiosCheckboxes('check-canais');
            bloqueiosGlobais.filmes = coletarBloqueiosCheckboxes('check-filmes');
            bloqueiosGlobais.series = coletarBloqueiosCheckboxes('check-series');
        }

        if(!usuario || !senha) return alert("Preencha Usuário e Senha.");
        if(!servidor_id) return alert("Por favor, selecione um Servidor para o cliente.");

        const dados = { 
            usuario: usuario, 
            senha: senha, 
            status: status, 
            servidor_id: servidor_id, 
            vencimento: vencimento,
            telas: telas,
            bloqueios: bloqueiosGlobais 
        };

        if (id) { 
            await db.collection("usuarios").doc(id).update(dados); 
        } else { 
            dados.criadoEm = firebase.firestore.FieldValue.serverTimestamp(); 
            await db.collection("usuarios").add(dados); 
        }
        fecharModalCliente();
    } catch (error) { 
        alert("Erro ao salvar cliente: " + error.message); 
    }
}

async function excluirCliente(id, nome) {
    if(confirm(`Excluir o acesso de "${nome}"?`)) { 
        try { await db.collection("usuarios").doc(id).delete(); } 
        catch (error) { alert("Erro ao excluir: " + error.message); } 
    }
}

function abrirModalCliente() {
    try {
        pastasRenderizadasComSucesso = false; // Trava ativada
        
        document.getElementById('modal-titulo-cliente').innerText = "Adicionar Novo Cliente";
        document.getElementById('cliente-id').value = ""; 
        document.getElementById('cliente-usuario').value = "";
        document.getElementById('cliente-senha').value = ""; 
        document.getElementById('cliente-status').value = "ativo";
        document.getElementById('cliente-servidor').value = ""; 
        document.getElementById('cliente-vencimento').value = "";
        if(document.getElementById('cliente-telas')) document.getElementById('cliente-telas').value = 1;

        bloqueiosGlobais = { canais: [], filmes: [], series: [] };
        
        const boxListas = document.getElementById('box-listas-bloqueio');
        const btnCarregar = document.getElementById('btn-carregar-pastas');
        
        if(boxListas) boxListas.style.display = 'none';
        if(btnCarregar) {
            btnCarregar.style.display = 'block';
            btnCarregar.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Carregar Pastas do Servidor';
        }

        document.getElementById('modal-cliente').classList.add('open');
    } catch(e) {}
}

function prepararEdicaoCliente(id) {
    try {
        pastasRenderizadasComSucesso = false; // Trava ativada

        const c = clientesGlobaisCache.find(cliente => cliente.id === id);
        if(!c) return alert("Erro ao buscar dados do cliente.");

        document.getElementById('modal-titulo-cliente').innerText = "Editar Cliente";
        document.getElementById('cliente-id').value = id; 
        document.getElementById('cliente-usuario').value = c.usuario;
        document.getElementById('cliente-senha').value = c.senha; 
        document.getElementById('cliente-status').value = c.status;
        document.getElementById('cliente-servidor').value = c.servidor_id || ""; 
        document.getElementById('cliente-vencimento').value = c.vencimento || "";
        if(document.getElementById('cliente-telas')) document.getElementById('cliente-telas').value = c.telas || 1;
        
        // 🛡️ CLONE PROFUNDO: Garante que o firebase não perca a memória
        bloqueiosGlobais = {
            canais: [...(c.bloqueios?.canais || [])],
            filmes: [...(c.bloqueios?.filmes || [])],
            series: [...(c.bloqueios?.series || [])]
        };
        
        const boxListas = document.getElementById('box-listas-bloqueio');
        const btnCarregar = document.getElementById('btn-carregar-pastas');
        
        if(boxListas) boxListas.style.display = 'none';
        if(btnCarregar) {
            btnCarregar.style.display = 'block';
            btnCarregar.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Carregar Pastas do Servidor';
        }

        document.getElementById('modal-cliente').classList.add('open');
    } catch(e) {}
}

function fecharModalCliente() { 
    const m = document.getElementById('modal-cliente');
    if(m) m.classList.remove('open'); 
}
