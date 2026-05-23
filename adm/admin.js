// ============================================================================
// 🔥 INICIALIZAÇÃO DO FIREBASE (COM SUAS CHAVES)
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
let clientesGlobaisCache = []; 

document.addEventListener('DOMContentLoaded', () => { carregarServidores(true); });

function mudarAbaAdm(aba) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('nav-' + aba).classList.add('active');
    document.querySelectorAll('.view-adm').forEach(el => el.classList.add('escondido'));
    document.getElementById('sec-' + aba).classList.remove('escondido');
    
    if(aba === 'clientes') carregarClientes();
    if(aba === 'servidores') carregarServidores();
    if(aba === 'relatorios') gerarRelatorios();
}

// ============================================================================
// 📊 RELATÓRIOS E FINANCEIRO
// ============================================================================
function gerarRelatorios() {
    const ticketMedio = parseFloat(document.getElementById('ticket-medio').value) || 0;
    let total = clientesGlobaisCache.length; let ativos = 0; let inativos = 0; let testes = 0;
    let hoje = new Date(); agoraMs = hoje.getTime();
    
    const tbodyRetencao = document.getElementById('lista-retencao-body');
    tbodyRetencao.innerHTML = ""; let vencendoHTML = "";

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
    document.getElementById('stat-total').innerText = total; document.getElementById('stat-ativos').innerText = ativos;
    document.getElementById('stat-inativos').innerText = inativos; document.getElementById('stat-testes').innerText = testes;
    document.getElementById('stat-mrr').innerText = mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
        
        tbody.innerHTML = ''; selectCliente.innerHTML = '<option value="">-- Selecione um Servidor --</option>'; servidoresMap = {};

        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding: 40px;">Nenhum servidor cadastrado.</td></tr>`;
        } else {
            snapshot.forEach((doc) => {
                const srv = doc.data(); const id = doc.id;
                servidoresMap[id] = srv.nome; 

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
    }, (error) => { alert("Erro ao buscar servidores: " + error.message); });
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
    document.getElementById('modal-titulo-servidor').innerText = "Adicionar Servidor";
    document.getElementById('servidor-id').value = ""; document.getElementById('servidor-nome').value = "";
    document.getElementById('servidor-url').value = ""; document.getElementById('servidor-tipo').value = "xtream";
    document.getElementById('servidor-xtream-user').value = ""; document.getElementById('servidor-xtream-pass').value = "";
    alternarCamposServidor();
    document.getElementById('modal-servidor').classList.add('open');
}

function fecharModalServidor() { document.getElementById('modal-servidor').classList.remove('open'); }

// ============================================================================
// ⚙️ MÓDULO DE CLIENTES
// ============================================================================
function carregarClientes() {
    db.collection("usuarios").orderBy("criadoEm", "desc").onSnapshot((snapshot) => {
        const tbody = document.getElementById('lista-clientes-body'); 
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
                            <button class="acao-btn edit" onclick="prepararEdicaoCliente('${id}', '${c.usuario}', '${c.senha}', '${c.status}', '${c.servidor_id}', '${c.vencimento || ''}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                            <button class="acao-btn delete" onclick="excluirCliente('${id}', '${c.usuario}')" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>
                        </td>
                    </tr>
                `;
            });
        }
        document.getElementById('loading-clientes').classList.add('escondido');
        document.getElementById('tabela-clientes-container').classList.remove('escondido');
        
        if(document.getElementById('sec-relatorios').classList.contains('escondido') === false) { gerarRelatorios(); }
    }, (error) => { alert("Erro ao buscar clientes: " + error.message); });
}

async function salvarCliente() {
    const id = document.getElementById('cliente-id').value; const usuario = document.getElementById('cliente-usuario').value.trim();
    const senha = document.getElementById('cliente-senha').value.trim(); const status = document.getElementById('cliente-status').value;
    const servidor_id = document.getElementById('cliente-servidor').value; const vencimento = document.getElementById('cliente-vencimento').value;

    if(!usuario || !senha) return alert("Preencha Usuário e Senha.");
    if(!servidor_id) return alert("Por favor, selecione um Servidor para o cliente.");

    const dados = { usuario: usuario, senha: senha, status: status, servidor_id: servidor_id, vencimento: vencimento };

    try {
        if (id) { await db.collection("usuarios").doc(id).update(dados); } 
        else { dados.criadoEm = firebase.firestore.FieldValue.serverTimestamp(); await db.collection("usuarios").add(dados); }
        fecharModalCliente();
    } catch (error) { alert("Erro ao salvar cliente: " + error.message); }
}

async function excluirCliente(id, nome) {
    if(confirm(`Excluir o acesso de "${nome}"?`)) { try { await db.collection("usuarios").doc(id).delete(); } catch (error) { alert("Erro ao excluir: " + error.message); } }
}

function abrirModalCliente() {
    document.getElementById('modal-titulo-cliente').innerText = "Adicionar Novo Cliente";
    document.getElementById('cliente-id').value = ""; document.getElementById('cliente-usuario').value = "";
    document.getElementById('cliente-senha').value = ""; document.getElementById('cliente-status').value = "ativo";
    document.getElementById('cliente-servidor').value = ""; document.getElementById('cliente-vencimento').value = "";
    document.getElementById('modal-cliente').classList.add('open');
}

function prepararEdicaoCliente(id, usuario, senha, status, servidor_id, vencimento) {
    document.getElementById('modal-titulo-cliente').innerText = "Editar Cliente";
    document.getElementById('cliente-id').value = id; document.getElementById('cliente-usuario').value = usuario;
    document.getElementById('cliente-senha').value = senha; document.getElementById('cliente-status').value = status;
    document.getElementById('cliente-servidor').value = servidor_id || ""; document.getElementById('cliente-vencimento').value = vencimento;
    document.getElementById('modal-cliente').classList.add('open');
}

function fecharModalCliente() { document.getElementById('modal-cliente').classList.remove('open'); }

