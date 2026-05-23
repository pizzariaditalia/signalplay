// ============================================================================
// 🔥 CONEXÃO EXCLUSIVA DO FIREBASE COM AS SUAS CREDENCIAIS OFICIAIS
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

// ESTADOS GLOBAIS E VARIÁVEIS
let listaCanaisAtiva = []; let abaAtivaGlobal = "home"; let viewAtivaGlobal = "home"; let categorySelectedGlobal = "";
let cacheEpisodiosSerieAtiva = {}; let seriesIdAtivaGlobal = ""; let idMidiaAtiva = ""; let tipoMidiaAtiva = ""; let urlSintonizadaAtiva = ""; let nomeMidiaAtiva = "";
let temProgressoAnterior = false; 

const ORDEM_FIXA_TV = [ "Jogos de Hoje", "Casa do Patrão", "Canais | Abertos", "Canais | Notícias", "Canais | Globo", "Canais | SBT", "Canais | RecordTV", "Canais | Band", "Canais | Esportes", "Canais | Premiere", "Canais | ESPN", "Canais | SporTV", "Canais | Prime Video", "Canais | Brasileirão", "Canais | MAX", "Canais | DAZN", "Canais | UFC Fight Pass", "Canais | Paramount+", "Canais | Disney+", "Canais | Estaduais", "Canais | Futsal", "Canais | NBA League Pass", "Canais | Legendados", "Canais | Documentários", "Canais | Filmes e Séries", "Canais | Telecine", "Canais | HBO", "Canais | TNT", "Canais | Variedades", "Canais | Religiosos", "Canais | Infantil", "Canais | Diversos", "Canais | Pluto TV", "Canais | Dual Áudio", "Canais | 24h Infantil", "Canais | 24h Variados", "Canais | Cine Bit", "Canais | Adultos", "Canais | HachuTV Adultos", "Canais | Adultos [4K]", "Canais | Dormir e Relaxar", "Vídeos Educativos", "Treinos, Aulas e Receitas", "Câmeras", "Rádios", "Shows", "Outros", "Canais | COMÉDIA" ];

let itensRenderizadosNaGrade = 0; const QTD_POR_PAGINA = 60; let canaisFatiadosGlobais = []; 
let listaDeReproducaoGlobal = []; let indicePlaylistGlobal = -1; let timerControles = null; let estadoRotacaoPaisagem = false;

let qnCategorias = []; let qnCategoriaIndex = 0; let epgAtivoGlobal = [];
let prateleiraObserver = null;

function iniciarRelogio() { function atualizar() { const agora = new Date(); const horas = String(agora.getHours()).padStart(2, '0'); const minutos = String(agora.getMinutes()).padStart(2, '0'); const relogio = document.getElementById('relogio-header'); if(relogio) relogio.innerText = `${horas}:${minutos}`; } atualizar(); setInterval(atualizar, 60000); }

// ============================================================================
// 💾 MOTOR DE BANCO DE DADOS LOCAL (IndexedDB) - CARREGAMENTO EM 1 SEGUNDO
// ============================================================================
const dbName = "SignalPlayDB";
const storeName = "catalogo";

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onerror = () => reject();
        request.onupgradeneeded = (event) => {
            const dbObj = event.target.result;
            if (!dbObj.objectStoreNames.contains(storeName)) {
                dbObj.createObjectStore(storeName); 
            }
        };
        request.onsuccess = (event) => resolve(event.target.result);
    });
}

async function saveToDB(lista) {
    try {
        const dbObj = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = dbObj.transaction([storeName], "readwrite");
            const store = transaction.objectStore(storeName);
            store.put(lista, "lista_completa"); // Salva a lista gigante de uma vez só!
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject();
        });
    } catch (e) { console.log("Erro ao salvar no IndexedDB", e); }
}

async function loadFromDB() {
    try {
        const dbObj = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = dbObj.transaction([storeName], "readonly");
            const store = transaction.objectStore(storeName);
            const request = store.get("lista_completa");
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject();
        });
    } catch (e) { return null; }
}

async function clearDB() {
    try {
        const dbObj = await initDB();
        return new Promise((resolve) => {
            const transaction = dbObj.transaction([storeName], "readwrite");
            const store = transaction.objectStore(storeName);
            store.clear();
            transaction.oncomplete = () => resolve();
        });
    } catch(e) {}
}


// ============================================================================
// 🎮 INICIALIZAÇÃO NATIVA E NAVEGAÇÃO DE TV
// ============================================================================
document.addEventListener('DOMContentLoaded', () => { 
    carregarAvatarGlobal(); verificarCredenciaisSalvas(); configurarMonitoramentoPlayerPC(); configurarMotorDeGestos(); configurarObserverPrateleiras(); iniciarRelogio(); 
    const avatar = document.querySelector('.user-avatar'); if(avatar) avatar.addEventListener('click', abrirPerfil);
    
    if (typeof SpatialNavigation !== 'undefined') {
        SpatialNavigation.init();
        SpatialNavigation.add({ selector: 'button, input, select, .nav-item, .card-h, .card-grid, .card-top10, .quick-nav-item, .card-episodio, .ajuste-btn-cinema, .btn-control' });
        SpatialNavigation.makeFocusable(); SpatialNavigation.focus();
    }
});

function reativarFocoTV() { if (typeof SpatialNavigation !== 'undefined') { SpatialNavigation.makeFocusable(); } }

// ============================================================================
// 👤 FOTO DE PERFIL CUSTOMIZADA E MODAIS
// ============================================================================
function carregarAvatarGlobal() { const avatarSalvo = localStorage.getItem('iptv_avatar_base64'); const nomeCliente = localStorage.getItem('iptv_client_name') || 'U'; const fotoDefault = `https://ui-avatars.com/api/?name=${encodeURIComponent(nomeCliente)}&background=ffcc00&color=000&bold=true`; const srcFinal = avatarSalvo ? avatarSalvo : fotoDefault; const imgHeader = document.getElementById('header-avatar-img'); const imgModal = document.getElementById('perfil-avatar-img'); if(imgHeader) imgHeader.src = srcFinal; if(imgModal) imgModal.src = srcFinal; }
function trocarFotoPerfil(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function(e) { const img = new Image(); img.onload = function() { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); const MAX_SIZE = 150; let width = img.width; let height = img.height; if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } } canvas.width = width; canvas.height = height; ctx.drawImage(img, 0, 0, width, height); const base64 = canvas.toDataURL('image/jpeg', 0.8); localStorage.setItem('iptv_avatar_base64', base64); carregarAvatarGlobal(); }; img.src = e.target.result; }; reader.readAsDataURL(file); }
function abrirPerfil() { const nomeCliente = localStorage.getItem('iptv_client_name') || 'Usuário'; const userInfo = JSON.parse(localStorage.getItem('iptv_user_info') || '{}'); document.getElementById('perfil-nome').innerText = `Olá, ${nomeCliente}!`; if (userInfo.exp_date && userInfo.exp_date !== "null") { let dataExp = new Date(userInfo.exp_date * 1000); document.getElementById('perfil-vencimento').innerText = dataExp.toLocaleDateString('pt-BR'); } else { document.getElementById('perfil-vencimento').innerText = "Ilimitado"; } let ativas = userInfo.active_cons || 0; let max = userInfo.max_connections || 0; document.getElementById('perfil-telas').innerText = `${ativas} / ${max === 0 ? 'Ilimitado' : max}`; const badge = document.getElementById('perfil-status-badge'); if (userInfo.status === "Active" || userInfo.status === "Local" || userInfo.status === "M3U") { badge.className = "badge-status ativo"; badge.innerText = "Conta Ativa"; } else { badge.className = "badge-status inativo"; badge.innerText = "Inativa/Vencida"; } document.getElementById('modal-perfil').classList.remove('escondido'); setTimeout(() => document.getElementById('modal-perfil').classList.add('open'), 50); reativarFocoTV(); }
function abrirConfiguracoes() { const bloqueioAtivo = localStorage.getItem('iptv_parental') === 'true'; document.getElementById('toggle-adulto').checked = bloqueioAtivo; document.getElementById('modal-configs').classList.remove('escondido'); setTimeout(() => document.getElementById('modal-configs').classList.add('open'), 50); reativarFocoTV(); }
function fecharModais() { document.querySelectorAll('.modal-overlay').forEach(m => { m.classList.remove('open'); setTimeout(() => m.classList.add('escondido'), 300); }); if (typeof SpatialNavigation !== 'undefined') SpatialNavigation.focus(); }
function limparHistorico(tipo) { if(tipo === 'continuar') { if(confirm("Deseja apagar a lista de Continuar Assistindo?")) { localStorage.removeItem('iptv_continuar_vod'); alert("Histórico limpo!"); fecharModais(); renderizarDashboardHome(); } } else if (tipo === 'favoritos') { if(confirm("Deseja remover todos os canais Favoritos?")) { localStorage.removeItem('iptv_favoritos_tv'); alert("Favoritos removidos!"); fecharModais(); renderizarDashboardHome(); } } }

// Logout agora limpa também o banco de dados!
async function sairDaConta() { 
    if(confirm("Deseja desconectar sua conta?")) { 
        await clearDB();
        localStorage.removeItem('iptv_credentials'); localStorage.removeItem('iptv_user_info'); localStorage.removeItem('iptv_client_name'); localStorage.removeItem('iptv_avatar_base64'); window.location.reload(); 
    } 
}
function alternarBarraBusca() { const c = document.getElementById('container-pesquisa'); c.classList.toggle('escondido'); if(!c.classList.contains('escondido')) { document.getElementById('input-busca').focus(); } else { document.getElementById('input-busca').value = ""; filtrarPesquisa(); } }


// ============================================================================
// 🔐 AUTENTICAÇÃO TRIPLA COM VERIFICAÇÃO DE CACHE (INDEXEDDB)
// ============================================================================
function mostrarErroLogin(mensagem) { const boxErro = document.getElementById('login-mensagem-erro'); boxErro.innerText = mensagem; boxErro.classList.remove('escondido'); }
function esconderErroLogin() { document.getElementById('login-mensagem-erro').classList.add('escondido'); }

async function verificarCredenciaisSalvas() {
    const xtreamSalvo = localStorage.getItem('iptv_credentials');
    if (xtreamSalvo) { 
        const config = JSON.parse(xtreamSalvo); 
        document.getElementById('tela-loading').classList.remove('escondido');
        document.getElementById('loading-title').innerText = "Carregando Catálogo...";

        // ⚡ O PULO DO GATO: Verifica se a lista gigante já está salva no IndexedDB!
        let dadosLocais = await loadFromDB();
        
        if (dadosLocais && dadosLocais.length > 0) {
            // Se já tem, carrega instantaneamente!
            listaCanaisAtiva = dadosLocais;
            document.getElementById('tela-loading').classList.add('escondido');
            mudarAbaPrincipal("home");
        } else {
            // Se não tem (primeiro acesso ou DB foi apagado), faz o download lento.
            if(config.tipo === 'embutido') { iniciarDownloadEmbutido(); } 
            else if(config.tipo === 'm3u') { iniciarDownloadM3U(config.url); }
            else { iniciarDownloadDaListaJSON(config); }
        }
    } else { 
        document.getElementById('tela-login-app').classList.remove('escondido'); 
        setTimeout(() => document.getElementById('tela-login-app').style.opacity = '1', 50); 
    }
}

async function forcarSincronizacao() {
    fecharModais();
    const xtreamSalvo = localStorage.getItem('iptv_credentials');
    if (!xtreamSalvo) return;
    const config = JSON.parse(xtreamSalvo);
    
    // Apaga a lista velha e forca baixar tudo de novo
    await clearDB();
    listaCanaisAtiva = [];
    
    if(config.tipo === 'embutido') { iniciarDownloadEmbutido(); }
    else if(config.tipo === 'm3u') { iniciarDownloadM3U(config.url); }
    else { iniciarDownloadDaListaJSON(config); }
}

async function salvarLinkDireto() {
    esconderErroLogin();
    const userDigitado = document.getElementById('iptv-user-x').value.trim(); const passDigitada = document.getElementById('iptv-pass-x').value.trim();
    if(!userDigitado || !passDigitada) return mostrarErroLogin("Preencha seu Usuário e Senha!");

    document.getElementById('tela-login-app').style.opacity = '0'; document.getElementById('tela-loading').classList.remove('escondido'); document.getElementById('loading-title').innerText = "Validando Acesso...";
    
    try {
        const snapshot = await db.collection("usuarios").where("usuario", "==", userDigitado).where("senha", "==", passDigitada).get();
        if (snapshot.empty) throw new Error("Usuário ou senha inválidos.");

        let dadosFirebase = snapshot.docs[0].data();
        if(dadosFirebase.status !== "ativo" && dadosFirebase.status !== "teste") throw new Error("Acesso Suspenso: Conta expirada ou bloqueada!");
        if(!dadosFirebase.servidor_id) throw new Error("Aviso: Nenhum servidor associado no painel.");

        const serverDoc = await db.collection("servidores").doc(dadosFirebase.servidor_id).get();
        if(!serverDoc.exists) throw new Error("Falha no Sistema: O servidor vinculado foi excluído.");
        
        let sData = serverDoc.data();
        let tipoServer = sData.tipo || 'xtream';

        if (tipoServer === 'embutido') {
            const config = { tipo: 'embutido', url: 'local' };
            localStorage.setItem('iptv_credentials', JSON.stringify(config));
            localStorage.setItem('iptv_user_info', JSON.stringify({status: "Local", auth: 1, max_connections: "Ilimitado"}));
            localStorage.setItem('iptv_client_name', dadosFirebase.usuario);
            document.getElementById('tela-login-app').classList.add('escondido'); carregarAvatarGlobal();
            iniciarDownloadEmbutido();
        } else if (tipoServer === 'm3u') {
            const config = { tipo: 'm3u', url: sData.url };
            localStorage.setItem('iptv_credentials', JSON.stringify(config));
            localStorage.setItem('iptv_user_info', JSON.stringify({status: "M3U", auth: 1, max_connections: "Ilimitado"}));
            localStorage.setItem('iptv_client_name', dadosFirebase.usuario);
            document.getElementById('tela-login-app').classList.add('escondido'); carregarAvatarGlobal();
            iniciarDownloadM3U(sData.url);
        } else {
            let urlServidor = sData.url; let masterUser = sData.xtream_user; let masterPass = sData.xtream_pass;
            const cleanUrl = urlServidor.endsWith('/') ? urlServidor.slice(0, -1) : urlServidor;
            document.getElementById('loading-title').innerText = "Conectando ao Provedor...";
            let authData = null;
            try { let authRes = await fetch(`${cleanUrl}/player_api.php?username=${masterUser}&password=${masterPass}`); authData = await authRes.json(); } 
            catch(e) { let pUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`${cleanUrl}/player_api.php?username=${masterUser}&password=${masterPass}`)}`; let authRes = await fetch(pUrl); authData = await authRes.json(); }

            if (!authData || !authData.user_info || authData.user_info.auth === 0) throw new Error("O Servidor IPTV recusou a conexão da lista mestra.");
            const config = { tipo: 'xtream', url: cleanUrl, user: masterUser, pass: masterPass };
            localStorage.setItem('iptv_credentials', JSON.stringify(config)); localStorage.setItem('iptv_user_info', JSON.stringify(authData.user_info)); localStorage.setItem('iptv_client_name', dadosFirebase.usuario);

            document.getElementById('tela-login-app').classList.add('escondido'); carregarAvatarGlobal(); iniciarDownloadDaListaJSON(config);
        }

    } catch (error) { document.getElementById('tela-loading').classList.add('escondido'); document.getElementById('tela-login-app').classList.remove('escondido'); document.getElementById('tela-login-app').style.opacity = '1'; mostrarErroLogin(error.message); }
}

// ============================================================================
// 📥 MOTORES DE DOWNLOAD E ARMAZENAMENTO AUTOMÁTICO
// ============================================================================
async function iniciarDownloadEmbutido() {
    document.getElementById('loading-title').innerText = "Carregando Servidor VIP...";
    document.getElementById('tela-loading').classList.remove('escondido');
    setTimeout(async () => {
        listaCanaisAtiva = [...LISTA_LOCAL_APP]; 
        await saveToDB(listaCanaisAtiva); // ⚡ Salva no DB Local
        document.getElementById('tela-loading').classList.add('escondido');
        mudarAbaPrincipal("home");
    }, 1000);
}

async function iniciarDownloadM3U(url) {
    document.getElementById('loading-title').innerText = "Baixando Lista M3U...";
    document.getElementById('tela-loading').classList.remove('escondido');
    try {
        let res = await fetch(url);
        if(!res.ok) throw new Error("Falha direta");
        let m3uText = await res.text();
        await processarTextoM3UParaCatalogo(m3uText);
    } catch(e) {
        try {
            let pUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            let resP = await fetch(pUrl);
            let m3uText = await resP.text();
            await processarTextoM3UParaCatalogo(m3uText);
        } catch(err) {
            document.getElementById('tela-loading').classList.add('escondido');
            localStorage.removeItem('iptv_credentials'); localStorage.removeItem('iptv_user_info');
            document.getElementById('tela-login-app').classList.remove('escondido'); document.getElementById('tela-login-app').style.opacity = '1';
            mostrarErroLogin("A lista M3U está offline ou link é inválido.");
        }
    }
}

async function processarTextoM3UParaCatalogo(m3uText) {
    if(!m3uText.includes('#EXTINF')) throw new Error("Formato de lista inválido.");
    const lines = m3uText.split('\n'); let canaisParseados = []; let infoAtual = null; let cId = 1;
    for (let i = 0; i < lines.length; i++) {
        let linha = lines[i].trim();
        if (linha.startsWith('#EXTINF:')) {
            let logo = ''; let matchLogo = linha.match(/tvg-logo=(["'])(.*?)\1/); if(matchLogo) logo = matchLogo[2];
            let categoria = 'Outros'; let matchCat = linha.match(/group-title=(["'])(.*?)\1/); if(matchCat && matchCat[2].trim() !== "") categoria = matchCat[2].trim();
            let nome = 'Canal'; let lastCommaIndex = linha.lastIndexOf(','); if(lastCommaIndex !== -1) nome = linha.substring(lastCommaIndex + 1).trim();
            infoAtual = { id: String(cId++), nome: nome, logo: logo, categoria: categoria };
        } 
        else if (linha !== '' && !linha.startsWith('#') && infoAtual) {
            infoAtual.streamUrl = linha;
            if(infoAtual.streamUrl.endsWith('.ts')) infoAtual.streamUrl = infoAtual.streamUrl.slice(0, -3) + '.m3u8';
            let tipoDetectado = "tv";
            if (linha.includes('/movie/') || linha.includes('/vod/')) { tipoDetectado = "filme"; } else if (linha.includes('/series/')) { tipoDetectado = "serie"; }
            infoAtual.tipo = tipoDetectado; canaisParseados.push(infoAtual); infoAtual = null; 
        }
    }
    listaCanaisAtiva = canaisParseados; 
    await saveToDB(listaCanaisAtiva); // ⚡ Salva no DB Local
    document.getElementById('tela-loading').classList.add('escondido'); 
    mudarAbaPrincipal("home");
}

async function iniciarDownloadDaListaJSON(config) {
    async function buscarDadosDaAPI(action) { const url = `${config.url}/player_api.php?username=${config.user}&password=${config.pass}&action=${action}`; try { let res = await fetch(url); if (res.ok) { let txt = await res.text(); let clean = txt.trim(); if (clean.startsWith('[') || clean.startsWith('{')) return JSON.parse(clean); } } catch(e) {} try { let pUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`; let resP = await fetch(pUrl); if (resP.ok) { let txt = await resP.text(); let cleanP = txt.trim(); if (cleanP.startsWith('[') || cleanP.startsWith('{')) return JSON.parse(cleanP); } } catch(e) {} return []; }
    try {
        let canaisAcumulados = []; document.getElementById('tela-loading').classList.remove('escondido');
        document.getElementById('loading-title').innerText = "Baixando Canais de TV..."; const dataLiveCat = await buscarDadosDaAPI("get_live_categories"); const dataLiveStream = await buscarDadosDaAPI("get_live_streams");
        document.getElementById('loading-title').innerText = "Baixando Filmes..."; const dataVodCat = await buscarDadosDaAPI("get_vod_categories"); const dataVodStream = await buscarDadosDaAPI("get_vod_streams");
        document.getElementById('loading-title').innerText = "Baixando Séries..."; const dataSeriesCat = await buscarDadosDaAPI("get_series_categories"); const dataSeriesStream = await buscarDadosDaAPI("get_series");
        document.getElementById('loading-title').innerText = "Sincronizando Catálogo...";

        if (Array.isArray(dataLiveStream)) { let mL = {}; if (Array.isArray(dataLiveCat)) dataLiveCat.forEach(c => mL[String(c.category_id)] = c.category_name); dataLiveStream.forEach(canal => { canaisAcumulados.push({ id: String(canal.stream_id), nome: canal.name, logo: canal.stream_icon || "", categoria: mL[String(canal.category_id)] || "Outros Canais", tipo: "tv", streamUrl: `${config.url}/live/${config.user}/${config.pass}/${canal.stream_id}.m3u8`, epg_title: canal.epg_title || "" }); }); }
        if (Array.isArray(dataVodStream)) { let mV = {}; if (Array.isArray(dataVodCat)) dataVodCat.forEach(c => mV[String(c.category_id)] = c.category_name); dataVodStream.forEach(canal => { canaisAcumulados.push({ id: String(canal.stream_id), nome: canal.name, logo: canal.stream_icon || "", categoria: mV[String(canal.category_id)] || "Outros Filmes", tipo: "filme", rating: canal.rating || canal.rating_5based || 0, streamUrl: `${config.url}/movie/${config.user}/${config.pass}/${canal.stream_id}.${canal.container_extension || "mp4"}` }); }); }
        if (Array.isArray(dataSeriesStream)) { let mS = {}; if (Array.isArray(dataSeriesCat)) dataSeriesCat.forEach(c => mS[String(c.category_id)] = c.category_name); dataSeriesStream.forEach(canal => { canaisAcumulados.push({ id: String(canal.series_id), nome: canal.name, logo: canal.cover || canal.stream_icon || "", categoria: mS[String(canal.category_id)] || "Outras Séries", tipo: "serie", rating: canal.rating || canal.rating_5based || 0, streamUrl: `${config.url}/player_api.php?username=${config.user}&password=${config.pass}&action=get_series_info&series_id=${canal.series_id}` }); }); }

        if (canaisAcumulados.length === 0) throw new Error("A lista de canais retornou vazia.");
        listaCanaisAtiva = canaisAcumulados; 
        
        await saveToDB(listaCanaisAtiva); // ⚡ Salva no DB Local
        
        document.getElementById('tela-loading').classList.add('escondido'); 
        mudarAbaPrincipal("home"); 
    } catch (error) { document.getElementById('tela-loading').classList.add('escondido'); localStorage.removeItem('iptv_credentials'); localStorage.removeItem('iptv_user_info'); localStorage.removeItem('iptv_client_name'); document.getElementById('tela-login-app').classList.remove('escondido'); document.getElementById('tela-login-app').style.opacity = '1'; mostrarErroLogin("Falha na sincronização: " + error.message); }
}

// ============================================================================
// ⚡ NAVEGAÇÃO E SISTEMAS NATIVOS RESTANTES
// ============================================================================
function mudarAbaPrincipal(novaAba) { 
    abaAtivaGlobal = novaAba; document.body.className = 'aba-' + novaAba; 
    document.querySelectorAll('.app-header-flutuante .nav-item').forEach(i => i.classList.remove('active')); const alvo = document.getElementById(`tab-${novaAba}`); if(alvo) alvo.classList.add('active'); 
    ['view-home', 'view-tv', 'view-filme', 'view-serie', 'view-canais', 'view-detalhes'].forEach(id => { document.getElementById(id).classList.add('escondido'); }); document.getElementById('input-busca').value = ""; 

    if (novaAba === 'home') { viewAtivaGlobal = "home"; document.getElementById('view-home').classList.remove('escondido'); renderizarDashboardHome(); }
    else if (novaAba === 'tv') { viewAtivaGlobal = "dashboard"; document.getElementById('view-tv').classList.remove('escondido'); renderizarDashboardMídia('tv'); }
    else if (novaAba === 'filme') { viewAtivaGlobal = "dashboard"; document.getElementById('view-filme').classList.remove('escondido'); renderizarDashboardMídia('filme'); }
    else if (novaAba === 'serie') { viewAtivaGlobal = "dashboard"; document.getElementById('view-serie').classList.remove('escondido'); renderizarDashboardMídia('serie'); }
    document.getElementById('painel-conteudo-principal').scrollTop = 0;
    reativarFocoTV();
}

function configurarObserverPrateleiras() { prateleiraObserver = new IntersectionObserver((entries) => { entries.forEach(entry => { if (entry.isIntersecting) { const target = entry.target; const category = target.dataset.category; const tipo = target.dataset.tipo; if (!target.dataset.loaded) { popularPrateleiraHTML(target, category, tipo); target.dataset.loaded = "true"; } } }); }, { root: document.getElementById('painel-conteudo-principal'), rootMargin: '200px' }); }

function aplicarControleParental() { const toggle = document.getElementById('toggle-adulto').checked; localStorage.setItem('iptv_parental', toggle); mudarAbaPrincipal(abaAtivaGlobal); }
function filtrarAdultos(listaBase) { const bloqueioAtivo = localStorage.getItem('iptv_parental') === 'true'; if (!bloqueioAtivo) return listaBase; const palavrasProibidas = ["adulto", "adult", "18+", "xxx", "porn", "sensual", "hachutv"]; return listaBase.filter(c => { let nomePasta = (c.categoria || "").toLowerCase(); return !palavrasProibidas.some(palavra => nomePasta.includes(palavra)); }); }

function safeDecodeBase64(str) { if (!str) return ""; try { if (str.includes(' ')) return str; let padded = str.padEnd(str.length + (4 - (str.length % 4)) % 4, '='); return decodeURIComponent(escape(window.atob(padded))); } catch (e) { try { return window.atob(str); } catch(err) { return str; } } }
function processarLogoSegura(url) { let safeUrl = String(url || "").trim(); if (!safeUrl || safeUrl.length < 5) return ""; if (!safeUrl.startsWith('http')) { try { const config = JSON.parse(localStorage.getItem('iptv_credentials') || '{}'); if (config.url) safeUrl = config.url + (safeUrl.startsWith('/') ? '' : '/') + safeUrl; } catch(e) {} } if (safeUrl.startsWith('http://')) { safeUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(safeUrl)}`; } return safeUrl; }
function obterHTMLImagemSegura(logoUrl, tipoMidia, isPequeno = false) { let icone = 'fa-tv'; if(tipoMidia === 'filme') icone = 'fa-film'; if(tipoMidia === 'serie') icone = 'fa-layer-group'; let extraClass = isPequeno ? ' fallback-mini' : ''; let fallbackHTML = `<div class="logo-fallback${extraClass}"><i class="fa-solid ${icone}"></i></div>`; let fallbackEscaped = fallbackHTML.replace(/"/g, "&quot;"); if(logoUrl && logoUrl.length > 5) { return `<img src="${logoUrl}" loading="lazy" onerror="this.outerHTML='${fallbackEscaped}'">`; } return fallbackHTML; }

function construirHeroBannerHTML(tipoAlvo = null) { let midias = filtrarAdultos(listaCanaisAtiva).filter(c => (tipoAlvo ? c.tipo === tipoAlvo : (c.tipo === 'filme' || c.tipo === 'serie')) && c.logo && c.logo.length > 5); let destaque = null; if (midias.length > 0) { let recentes = midias.sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 50); destaque = recentes[Math.floor(Math.random() * recentes.length)]; } if (!destaque) return ''; let logoSegura = processarLogoSegura(destaque.logo); let clickHero = destaque.tipo === 'tv' ? `roteadorMultiplataformaPlayer('${destaque.streamUrl}', '${encodeURIComponent(destaque.nome)}', '${destaque.id}', '${destaque.tipo}', 0)` : `abrirDetalhesMidia('${destaque.id}', '${destaque.tipo}', '${destaque.streamUrl}', '${encodeURIComponent(destaque.nome)}', '${encodeURIComponent(logoSegura)}')`; return `<div class="hero-banner" style="background-image: url('${logoSegura}');"><div class="hero-vignette"></div><div class="hero-content"><span class="hero-badge">Em Destaque</span><h1 class="hero-title">${destaque.nome}</h1><p class="hero-desc">${destaque.categoria}</p><button class="hero-btn sn-focusable" onclick="${clickHero}"><i class="fa-solid fa-play"></i> Assistir</button></div></div>`; }
function construirPrateleiraTop10(titulo, itensArray) { let html = `<div class="row-container" style="margin-top: 20px;"><h3 class="row-header">${titulo}</h3><div class="row-top10">`; itensArray.forEach((item, idx) => { let logoSegura = processarLogoSegura(item.logo); let imgHtml = obterHTMLImagemSegura(logoSegura, item.tipo); let click = `abrirDetalhesMidia('${item.id}', '${item.tipo}', '${item.streamUrl}', '${encodeURIComponent(item.nome)}', '${encodeURIComponent(logoSegura)}')`; html += `<button class="card-top10 sn-focusable" data-rank="${idx + 1}" onclick="${click}"><div class="top10-wrapper"><div class="top10-number">${idx + 1}</div><div class="top10-capa"><div class="top10-badge">TOP ${idx + 1}</div>${imgHtml}</div></div></button>`; }); html += `</div></div>`; return html; }
function construirContainerPrateleiraExterna(titulo, itensArray, estiloCard, hasProgress = false, forceCategory = null) { let html = `<div class="row-container"><h3 class="row-header">${titulo}</h3><div class="row-scroll">`; itensArray.forEach((item, idx) => { let logoSegura = processarLogoSegura(item.logo); let imgHtml = obterHTMLImagemSegura(logoSegura, item.tipo); let click = item.tipo === 'tv' ? `roteadorMultiplataformaPlayer('${item.streamUrl}', '${encodeURIComponent(item.nome)}', '${item.id}', '${item.tipo}', ${idx}, ${forceCategory ? `'${forceCategory}'` : 'null'})` : `abrirDetalhesMidia('${item.id}', '${item.tipo}', '${item.streamUrl}', '${encodeURIComponent(item.nome)}', '${encodeURIComponent(logoSegura)}')`; let progHtml = hasProgress ? `<div class="progresso-vod" style="width: 50%;"></div>` : ''; html += `<button class="card-h ${estiloCard} sn-focusable" onclick="${click}"><div class="capa">${imgHtml}${progHtml}</div><div class="card-title" title="${item.nome}">${item.nome}</div></button>`; }); html += `</div></div>`; return html; }

function renderizarDashboardHome() { const container = document.getElementById('view-home'); container.innerHTML = ""; container.innerHTML += construirHeroBannerHTML(); let listaFiltradaGlobal = filtrarAdultos(listaCanaisAtiva); const dCont = JSON.parse(localStorage.getItem('iptv_continuar_vod') || '[]'); if (dCont.length > 0) { let mapCont = []; dCont.forEach(i => { let ac = listaFiltradaGlobal.find(c => String(c.id) === String(i.id)); if(ac) mapCont.push({...ac, progresso: i.tempo}); }); if(mapCont.length > 0) container.innerHTML += construirContainerPrateleiraExterna("Continuar Assistindo", mapCont, "card-h-poster", true, "ContinuarAssistindo"); } const dFavs = JSON.parse(localStorage.getItem('iptv_favoritos_tv') || '[]'); if (dFavs.length > 0) { let mapFavs = []; dFavs.forEach(rid => { let ac = listaFiltradaGlobal.find(c => String(c.id) === String(rid) && c.tipo === 'tv'); if(ac) mapFavs.push(ac); }); if(mapFavs.length > 0) container.innerHTML += construirContainerPrateleiraExterna("Canais Favoritos", mapFavs, "card-h-wide", false, "Favoritos"); } let top10Filmes = listaFiltradaGlobal.filter(c => c.tipo === 'filme').sort((a, b) => (parseFloat(b.rating || 0) - parseFloat(a.rating || 0)) || (Number(b.id) - Number(a.id))).slice(0, 10); if(top10Filmes.length > 0) container.innerHTML += construirPrateleiraTop10("Top 10 Filmes", top10Filmes); let mapFilmes = listaFiltradaGlobal.filter(c => c.tipo === 'filme').sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 30); if(mapFilmes.length > 0) container.innerHTML += construirContainerPrateleiraExterna("Últimos Filmes Adicionados", mapFilmes, "card-h-poster"); let top10Series = listaFiltradaGlobal.filter(c => c.tipo === 'serie').sort((a, b) => (parseFloat(b.rating || 0) - parseFloat(a.rating || 0)) || (Number(b.id) - Number(a.id))).slice(0, 10); if(top10Series.length > 0) container.innerHTML += construirPrateleiraTop10("Top 10 Séries", top10Series); let mapSeries = listaFiltradaGlobal.filter(c => c.tipo === 'serie').sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 30); if(mapSeries.length > 0) container.innerHTML += construirContainerPrateleiraExterna("Séries em Alta", mapSeries, "card-h-poster"); reativarFocoTV(); }
function renderizarDashboardMídia(tipo) { const container = document.getElementById(`view-${tipo}`); container.innerHTML = ""; if (tipo === 'filme' || tipo === 'serie') container.innerHTML += construirHeroBannerHTML(tipo); else container.style.paddingTop = "80px"; let itensTipo = filtrarAdultos(listaCanaisAtiva.filter(c => c.tipo === tipo)); let contCat = {}; itensTipo.forEach(i => { contCat[i.categoria] = (contCat[i.categoria] || 0) + 1; }); const catOrdem = Object.keys(contCat).sort((a, b) => { if (tipo === "tv") { let iA = ORDEM_FIXA_TV.indexOf(a), iB = ORDEM_FIXA_TV.indexOf(b); if (iA === -1) iA = 9999; if (iB === -1) iB = 9999; return iA === iB ? a.localeCompare(b) : iA - iB; } else { return a.localeCompare(b); } }); catOrdem.forEach(cat => { let divBlock = document.createElement('div'); divBlock.className = 'row-container'; divBlock.innerHTML = `<h3 class="row-header">${cat} <button style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; font-weight:500;" class="sn-focusable" onclick="abrirGradeCanaisTradicional('${cat}', '${tipo}')">Ver Mais <i class="fa-solid fa-angle-right"></i></button></h3><div class="row-scroll lazy-row" data-category="${cat}" data-tipo="${tipo}"></div>`; container.appendChild(divBlock); prateleiraObserver.observe(divBlock.querySelector('.lazy-row')); }); reativarFocoTV(); }
function popularPrateleiraHTML(containerElement, categoria, tipo) { let canais = filtrarAdultos(listaCanaisAtiva).filter(c => c.tipo === tipo && c.categoria === categoria).slice(0, 30); let estiloCard = tipo === 'tv' ? "card-h-wide" : "card-h-poster"; let html = ""; canais.forEach((item, idx) => { let logoSegura = processarLogoSegura(item.logo); let imgHtml = obterHTMLImagemSegura(logoSegura, item.tipo); let click = item.tipo === 'tv' ? `roteadorMultiplataformaPlayer('${item.streamUrl}', '${encodeURIComponent(item.nome)}', '${item.id}', '${item.tipo}', ${idx}, '${categoria}')` : `abrirDetalhesMidia('${item.id}', '${item.tipo}', '${item.streamUrl}', '${encodeURIComponent(item.nome)}', '${encodeURIComponent(logoSegura)}')`; html += `<button class="card-h ${estiloCard} sn-focusable" onclick="${click}"><div class="capa">${imgHtml}</div><div class="card-title" title="${item.nome}">${item.nome}</div></button>`; }); containerElement.innerHTML = html; reativarFocoTV(); }

function filtrarPesquisa() { const termo = document.getElementById('input-busca').value.toLowerCase(); if (termo.length > 0) { categorySelectedGlobal = "BuscaGlobal"; abrirGradeCanaisTradicional("BuscaGlobal", abaAtivaGlobal); document.getElementById('btn-voltar-da-grade').innerHTML = `<i class="fa-solid fa-xmark"></i> Fechar Busca`; } else if (viewAtivaGlobal === "canais") { voltarParaDashboard(); } }
function abrirGradeCanaisTradicional(categoria, tipoForcado) { categorySelectedGlobal = categoria; viewAtivaGlobal = "canais"; ['view-home', 'view-tv', 'view-filme', 'view-serie'].forEach(id => document.getElementById(id).classList.add('escondido')); document.getElementById('view-canais').classList.remove('escondido'); document.getElementById('btn-voltar-da-grade').innerHTML = `<i class="fa-solid fa-chevron-left"></i> Voltar`; renderizarCanais(true); }
function voltarParaDashboard() { document.getElementById('input-busca').value = ""; mudarAbaPrincipal(abaAtivaGlobal); }
function obterCanaisDaCategoria(categoria) { const termo = document.getElementById('input-busca').value.toLowerCase(); let canaisFiltrados = []; if(categoria === "BuscaGlobal") { canaisFiltrados = listaCanaisAtiva.filter(c => c.nome.toLowerCase().includes(termo)); } else { canaisFiltrados = listaCanaisAtiva.filter(c => c.tipo === abaAtivaGlobal && c.categoria === categoria); } if (categoria === "Todos" && (abaAtivaGlobal === "filme" || abaAtivaGlobal === "serie")) { canaisFiltrados.sort((a, b) => Number(b.id) - Number(a.id)); } return filtrarAdultos(canaisFiltrados); }
function configurarRolagemInfinita() { const painel = document.getElementById('painel-conteudo-principal'); painel.addEventListener('scroll', () => { if (viewAtivaGlobal === "canais") { if (painel.scrollTop + painel.clientHeight >= painel.scrollHeight - 300) carregarMaisCanaisDOM(); } }); }
function renderizarCanais(reset = true) { const grade = document.getElementById('grade-canais-tv'); if (reset) { grade.innerHTML = ""; itensRenderizadosNaGrade = 0; document.getElementById('painel-conteudo-principal').scrollTop = 0; } canaisFatiadosGlobais = obterCanaisDaCategoria(categorySelectedGlobal); if(canaisFatiadosGlobais.length === 0){ grade.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--text-muted); margin-top:30px;">Nenhum conteúdo.</p>`; return; } listaDeReproducaoGlobal = canaisFatiadosGlobais.map(c => ({ id: c.id, nome: c.nome, logo: c.logo, tipo: c.tipo, streamUrl: c.streamUrl })); carregarMaisCanaisDOM(); }
function carregarMaisCanaisDOM() { if (itensRenderizadosNaGrade >= canaisFatiadosGlobais.length) return; const grade = document.getElementById('grade-canais-tv'); let favs = JSON.parse(localStorage.getItem('iptv_favoritos_tv') || '[]'); let fragment = document.createDocumentFragment(); let lote = canaisFatiadosGlobais.slice(itensRenderizadosNaGrade, itensRenderizadosNaGrade + QTD_POR_PAGINA); lote.forEach((canal, idxLote) => { let idxGlobal = itensRenderizadosNaGrade + idxLote; let logoSegura = processarLogoSegura(canal.logo); let isCardTV = canal.tipo === 'tv'; let classeCapa = isCardTV ? 'capa-tv' : 'capa-vod'; let imgHtml = obterHTMLImagemSegura(logoSegura, canal.tipo); let favH = isCardTV ? `<button class="btn-fav-card sn-focusable ${favs.includes(String(canal.id)) ? 'is-fav' : ''}" onclick="toggarFavorito('${canal.id}', event)"><i class="fa-solid fa-star"></i></button>` : ''; let badgeHTML = (categorySelectedGlobal === "BuscaGlobal") ? `<div class="badge-tipo">${isCardTV ? 'TV' : (canal.tipo === 'filme' ? 'FILME' : 'SÉRIE')}</div>` : ''; let click = isCardTV ? `roteadorMultiplataformaPlayer('${canal.streamUrl}', '${encodeURIComponent(canal.nome)}', '${canal.id}', '${canal.tipo}', ${idxGlobal})` : `abrirDetalhesMidia('${canal.id}', '${canal.tipo}', '${canal.streamUrl}', '${encodeURIComponent(canal.nome)}', '${encodeURIComponent(logoSegura)}')`; let btn = document.createElement('button'); btn.className = 'card-grid sn-focusable'; btn.onclick = new Function(click); btn.innerHTML = `<div class="${classeCapa}">${badgeHTML}${favH}${imgHtml}</div><div class="card-title-grid" title="${canal.nome}">${canal.nome}</div>`; fragment.appendChild(btn); }); grade.appendChild(fragment); itensRenderizadosNaGrade += QTD_POR_PAGINA; reativarFocoTV(); }
function toggarFavorito(id, e) { e.stopPropagation(); let f = JSON.parse(localStorage.getItem('iptv_favoritos_tv') || '[]'); id = String(id); f = f.includes(id) ? f.filter(i => i !== id) : [...f, id]; localStorage.setItem('iptv_favoritos_tv', JSON.stringify(f)); renderizarCanais(true); }

async function abrirDetalhesMidia(id, tipo, streamUrl, nomeEncoded, logoEncoded) {
    document.getElementById('tela-loading').classList.remove('escondido'); const c = JSON.parse(localStorage.getItem('iptv_credentials') || '{}');
    let nomeOriginal = decodeURIComponent(nomeEncoded); let logoOriginal = decodeURIComponent(logoEncoded);
    document.getElementById('detalhes-titulo').innerText = nomeOriginal; document.getElementById('detalhes-poster').innerHTML = obterHTMLImagemSegura(logoOriginal, tipo);
    document.getElementById('detalhes-backdrop').style.backgroundImage = `url('${logoOriginal}')`; document.getElementById('detalhes-ano').innerHTML = `<i class="fa-regular fa-calendar"></i> -`;
    document.getElementById('detalhes-nota').innerHTML = `<i class="fa-solid fa-star"></i> -`; document.getElementById('detalhes-sinopse').innerText = "Processando informações...";
    document.getElementById('detalhes-tipo-badge').innerText = tipo.toUpperCase(); document.getElementById('btn-play-filme').classList.add('escondido'); document.getElementById('area-series-episodios').classList.add('escondido');

    if (c.tipo === 'embutido' || c.tipo === 'm3u') {
        document.getElementById('tela-loading').classList.add('escondido'); document.getElementById('detalhes-sinopse').innerText = "Descrição indisponível.";
        let btnPlay = document.getElementById('btn-play-filme'); btnPlay.classList.remove('escondido');
        let idxFilme = listaDeReproducaoGlobal.findIndex(i => String(i.id) === String(id)); if (idxFilme === -1) { listaDeReproducaoGlobal = [{id: id, nome: nomeOriginal, logo: logoOriginal, tipo: tipo, streamUrl: streamUrl}]; idxFilme = 0; }
        btnPlay.innerHTML = `<i class="fa-solid fa-play"></i> ASSISTIR AGORA`; btnPlay.onclick = () => roteadorMultiplataformaPlayer(streamUrl, nomeEncoded, id, tipo, idxFilme);
    } else {
        let action = tipo === 'filme' ? 'get_vod_info&vod_id=' : 'get_series_info&series_id='; let urlAPI = `${c.url}/player_api.php?username=${c.user}&password=${c.pass}&action=${action}${id}`; let dataInfo = null;
        async function tentaFetch(url) { try { let res = await fetch(url); if(res.ok) { let txt = await res.text(); let idx1 = txt.indexOf('{'); let idx2 = txt.indexOf('['); let start = -1; if(idx1 !== -1 && idx2 !== -1) start = Math.min(idx1, idx2); else if(idx1 !== -1) start = idx1; else if(idx2 !== -1) start = idx2; if(start !== -1) return JSON.parse(txt.substring(start)); } } catch(e) {} return null; }
        dataInfo = await tentaFetch(urlAPI); if(!dataInfo) dataInfo = await tentaFetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(urlAPI)}`);
        document.getElementById('tela-loading').classList.add('escondido');
        if (dataInfo && dataInfo.info) { let i = dataInfo.info; if (i.name) document.getElementById('detalhes-titulo').innerText = i.name; if (i.description || i.plot) document.getElementById('detalhes-sinopse').innerText = i.description || i.plot; if (i.releasedate || i.releaseDate) document.getElementById('detalhes-ano').innerHTML = `<i class="fa-regular fa-calendar"></i> ${i.releasedate || i.releaseDate}`; if (i.rating) document.getElementById('detalhes-nota').innerHTML = `<i class="fa-solid fa-star"></i> ${i.rating}`; let bigImage = processarLogoSegura(i.backdrop_path && i.backdrop_path.length > 5 ? i.backdrop_path[0] : (i.movie_image || i.cover)); if (bigImage) { document.getElementById('detalhes-backdrop').style.backgroundImage = `url('${bigImage}')`; document.getElementById('detalhes-poster').innerHTML = `<img src="${bigImage}" style="width:100%;height:100%;object-fit:cover;">`; } }
        if (tipo === 'filme') { let btnPlay = document.getElementById('btn-play-filme'); btnPlay.classList.remove('escondido'); let idxFilme = listaDeReproducaoGlobal.findIndex(i => String(i.id) === String(id)); if (idxFilme === -1) { listaDeReproducaoGlobal = [{id: id, nome: nomeOriginal, logo: logoOriginal, tipo: tipo, streamUrl: streamUrl}]; idxFilme = 0; } let dHist = JSON.parse(localStorage.getItem('iptv_continuar_vod') || '[]'); let rHist = dHist.find(i => String(i.id) === String(id)); btnPlay.innerHTML = (rHist && rHist.tempo > 5) ? `<i class="fa-solid fa-play"></i> CONTINUAR ASSISTINDO` : `<i class="fa-solid fa-play"></i> ASSISTIR AGORA`; btnPlay.onclick = () => roteadorMultiplataformaPlayer(streamUrl, nomeEncoded, id, tipo, idxFilme); } else if (tipo === 'serie') { document.getElementById('area-series-episodios').classList.remove('escondido'); if (dataInfo && dataInfo.episodes) { cacheEpisodiosSerieAtiva = dataInfo.episodes; seriesIdAtivaGlobal = id; const sT = document.getElementById('select-temporadas'); sT.innerHTML = ""; let temps = Object.keys(dataInfo.episodes); temps.forEach(t => { sT.innerHTML += `<option value="${t}">Temporada ${t}</option>`; }); alternarTemporadaNativa(); } else { document.getElementById('lista-episodios-container').innerHTML = `<p style="color:var(--text-muted); padding:0 20px;">Sem episódios ativos.</p>`; } }
    }
    ['view-home', 'view-tv', 'view-filme', 'view-serie', 'view-canais'].forEach(vid => document.getElementById(vid).classList.add('escondido')); viewAtivaGlobal = "detalhes"; document.getElementById('view-detalhes').classList.remove('escondido'); document.getElementById('painel-conteudo-principal').scrollTop = 0; reativarFocoTV();
}
function voltarDeDetalhes() { voltarParaDashboard(); }
function alternarTemporadaNativa() { const gE = document.getElementById('lista-episodios-container'); gE.innerHTML = ""; const tS = document.getElementById('select-temporadas').value; const eps = (cacheEpisodiosSerieAtiva[tS] || []); if(eps.length === 0) { gE.innerHTML = `<p style="text-align:center; color:var(--text-muted); margin-top:20px;">Vazio.</p>`; return; } const c = JSON.parse(localStorage.getItem('iptv_credentials') || '{}'); listaDeReproducaoGlobal = eps.map(e => ({ id: seriesIdAtivaGlobal, nome: e.title, logo: (e.info && e.info.movie_image) ? e.info.movie_image : "", tipo: 'serie', streamUrl: `${c.url}/series/${c.user}/${c.pass}/${e.id || e.stream_id}.${e.container_extension || "mp4"}` })); eps.forEach((e, i) => { let logoSegura = processarLogoSegura(e.info && e.info.movie_image ? e.info.movie_image : ""); let imgHtml = obterHTMLImagemSegura(logoSegura, 'serie'); let clickEp = `roteadorMultiplataformaPlayer('${c.url}/series/${c.user}/${c.pass}/${e.id || e.stream_id}.${e.container_extension || "mp4"}', '${encodeURIComponent(e.title)}', '${seriesIdAtivaGlobal}', 'serie', ${i})`; gE.innerHTML += `<button class="card-episodio sn-focusable" onclick="${clickEp}"><div class="episodio-thumb">${imgHtml}</div><div class="episodio-info"><div class="episodio-title">${e.title}</div><div class="episodio-meta">Episódio ${i+1}</div></div><i class="fa-solid fa-play" style="color:var(--accent-yellow); margin-right:10px;"></i></button>`; }); reativarFocoTV(); }

function roteadorMultiplataformaPlayer(streamUrl, nomeCanalEncoded, id, tipo, indexNoDOM, forceCategoryRebuild = null) {
    if(tipo === 'tv') { let recs = JSON.parse(localStorage.getItem('iptv_recentes_tv') || '[]'); recs = recs.filter(rid => String(rid) !== String(id)); recs.unshift(String(id)); if(recs.length > 12) recs.pop(); localStorage.setItem('iptv_recentes_tv', JSON.stringify(recs)); } else { let d = JSON.parse(localStorage.getItem('iptv_continuar_vod') || '[]'); let r = d.find(i => String(i.id) === String(id)); if(!r) salvarProgressoVOD(id, tipo, 0); }
    if (forceCategoryRebuild) { categorySelectedGlobal = forceCategoryRebuild; let canaisCat = []; let filtrados = filtrarAdultos(listaCanaisAtiva); if (forceCategoryRebuild === 'Favoritos') { let favs = JSON.parse(localStorage.getItem('iptv_favoritos_tv') || '[]'); canaisCat = filtrados.filter(c => c.tipo === tipo && favs.includes(String(c.id))); } else if (forceCategoryRebuild === 'ContinuarAssistindo') { let cont = JSON.parse(localStorage.getItem('iptv_continuar_vod') || '[]'); cont.forEach(i => { let ac = filtrados.find(c => String(c.id) === String(i.id) && c.tipo === tipo); if(ac) canaisCat.push(ac); }); } else { canaisCat = filtrados.filter(c => c.tipo === tipo && c.categoria === forceCategoryRebuild); } listaDeReproducaoGlobal = canaisCat.map(c => ({ id: c.id, nome: c.nome, logo: c.logo, tipo: c.tipo, streamUrl: c.streamUrl })); let newIdx = listaDeReproducaoGlobal.findIndex(i => String(i.id) === String(id)); indicePlaylistGlobal = newIdx !== -1 ? newIdx : 0; } else { indicePlaylistGlobal = indexNoDOM; }
    executarPlayerCinema(streamUrl, nomeCanalEncoded, id, tipo);
}
function salvarProgressoVOD(id, tipo, tempo) { if(!id) return; let d = JSON.parse(localStorage.getItem('iptv_continuar_vod') || '[]'); d = d.filter(i => String(i.id) !== String(id)); d.unshift({ id: String(id), tipo: tipo, tempo: tempo }); if(d.length > 20) d.pop(); localStorage.setItem('iptv_continuar_vod', JSON.stringify(d)); }

function executarPlayerCinema(streamUrl, nomeCanalEncoded, id, tipo) {
    idMidiaAtiva = id; tipoMidiaAtiva = tipo; urlSintonizadaAtiva = streamUrl; nomeMidiaAtiva = decodeURIComponent(nomeCanalEncoded); temProgressoAnterior = false; 
    const m = document.getElementById('player-cinema-modal'), v = document.getElementById('video-player-elemento'); document.getElementById('player-cinema-title').innerHTML = nomeMidiaAtiva; m.classList.remove('escondido');
    if (m.requestFullscreen) { m.requestFullscreen().then(travarRotacaoLandscape).catch(e=>{}); } else if (m.webkitRequestFullscreen) { m.webkitRequestFullscreen().then(travarRotacaoLandscape).catch(e=>{}); }
    v.pause(); v.src = ""; document.getElementById('timeline-filled-cinema').style.width = "0%"; document.getElementById('player-buffer-overlay').classList.remove('escondido'); if(window.hlsP) { window.hlsP.destroy(); window.hlsP = null; }
    if (tipo === 'tv') { document.getElementById('btn-epg-player').classList.remove('escondido'); document.getElementById('sep-epg').classList.remove('escondido'); buscarEPGDinamico(id); } else { document.getElementById('btn-epg-player').classList.add('escondido'); document.getElementById('sep-epg').classList.add('escondido'); }
    if(streamUrl.includes('.m3u8')) { if (Hls.isSupported()){ window.hlsP = new Hls({ enableWorker: true }); window.hlsP.loadSource(streamUrl); window.hlsP.attachMedia(v); window.hlsP.on(Hls.Events.MANIFEST_PARSED, function() { v.play().catch(e=>{}); }); window.hlsP.on(Hls.Events.ERROR, function (event, data) { if (data.fatal) { if(data.type === Hls.ErrorTypes.NETWORK_ERROR) window.hlsP.startLoad(); else if(data.type === Hls.ErrorTypes.MEDIA_ERROR) window.hlsP.recoverMediaError(); } }); } else if (v.canPlayType('application/vnd.apple.mpegurl')) { v.src = streamUrl; v.play().catch(e=>{}); } } else { v.src = streamUrl; v.play().catch(e=>{}); }
    atualizarBotoesPlaylist(); resetarTimerControlesUI(); if(tipoMidiaAtiva !== 'serie') prepararCategoriasQuickNav(); reativarFocoTV();
}
function navegarVideoTimelineCinema(e) { const v = document.getElementById('video-player-elemento'), r = document.getElementById('timeline-container-cinema').getBoundingClientRect(); if(v.duration) v.currentTime = v.duration * ((e.clientX - r.left) / r.width); }
function toggarReproducaoCinema() { const v = document.getElementById('video-player-elemento'); v.paused ? v.play() : v.pause(); }
function mudarAspectoVideoCinema(m) { const v = document.getElementById('video-player-elemento'); v.classList.remove('ratio-stretch', 'ratio-16-9', 'ratio-4-3'); document.querySelectorAll('.ajuste-btn-cinema').forEach(b => b.classList.remove('ativo')); if(m!=='fit') v.classList.add(`ratio-${m}`); document.getElementById(`btn-ratio-${m.replace('.','')}-cinema`).classList.add('ativo'); }

async function buscarEPGDinamico(streamId) {
    epgAtivoGlobal = []; document.getElementById('btn-epg-player').style.opacity = '0.3'; const config = JSON.parse(localStorage.getItem('iptv_credentials') || '{}'); if(config.tipo !== 'xtream') return;
    let urlAPI = `${config.url}/player_api.php?username=${config.user}&password=${config.pass}&action=get_short_epg&stream_id=${streamId}&limit=15`; let dataEPG = null;
    async function tentaFetch(url) { try { let res = await fetch(url); if(res.ok) { let txt = await res.text(); let idx1 = txt.indexOf('{'); let idx2 = txt.indexOf('['); let start = -1; if(idx1 !== -1 && idx2 !== -1) start = Math.min(idx1, idx2); else if(idx1 !== -1) start = idx1; else if(idx2 !== -1) start = idx2; if(start !== -1) return JSON.parse(txt.substring(start)); } } catch(e) {} return null; }
    dataEPG = await tentaFetch(urlAPI); if(!dataEPG) dataEPG = await tentaFetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(urlAPI)}`);
    if (dataEPG && dataEPG.epg_listings && dataEPG.epg_listings.length > 0) { epgAtivoGlobal = dataEPG.epg_listings; document.getElementById('btn-epg-player').style.opacity = '1'; let tituloAgora = safeDecodeBase64(epgAtivoGlobal[0].title); document.getElementById('player-cinema-title').innerHTML = `${nomeMidiaAtiva} <span style="font-size:0.85rem; color:var(--accent-yellow); margin-left:12px; font-weight:500;">• Agora: ${tituloAgora}</span>`; } else { let canalAtivo = listaCanaisAtiva.find(c => String(c.id) === String(streamId) && c.tipo === 'tv'); if (canalAtivo && canalAtivo.epg_title) { let tituloAgora = safeDecodeBase64(canalAtivo.epg_title); document.getElementById('player-cinema-title').innerHTML = `${nomeMidiaAtiva} <span style="font-size:0.85rem; color:var(--accent-yellow); margin-left:12px; font-weight:500;">• Agora: ${tituloAgora}</span>`; epgAtivoGlobal = [{ title: canalAtivo.epg_title, description: "", start: "", end: "" }]; document.getElementById('btn-epg-player').style.opacity = '1'; } else { document.getElementById('btn-epg-player').style.opacity = '0.3'; } }
}
function abrirEPG() { document.getElementById('epg-modal').classList.add('open'); document.getElementById('player-controls-wrap').classList.add('fade-out'); const lista = document.getElementById('lista-epg-modal'); lista.innerHTML = ""; if (!epgAtivoGlobal || epgAtivoGlobal.length === 0) { lista.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-muted); text-align:center; padding: 20px;"><i class="fa-solid fa-satellite-dish" style="font-size:3rem; margin-bottom:15px; opacity:0.5;"></i><h4 style="color:#fff; margin:0 0 5px 0;">Guia Indisponível</h4><p style="font-size:0.85rem; margin:0;">O servidor não forneceu a grade de programação para este canal.</p></div>`; return; } epgAtivoGlobal.forEach((prog, idx) => { let sT = "--:--", eT = "--:--"; if (prog.start && prog.start.includes(' ')) sT = prog.start.split(' ')[1].substring(0,5); else if (prog.start_timestamp) { let d = new Date(prog.start_timestamp * 1000); sT = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); } if (prog.end && prog.end.includes(' ')) eT = prog.end.split(' ')[1].substring(0,5); else if (prog.stop_timestamp) { let d = new Date(prog.stop_timestamp * 1000); eT = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); } let title = safeDecodeBase64(prog.title) || "Programa"; let desc = safeDecodeBase64(prog.description) || "Nenhuma informação adicional."; lista.innerHTML += `<div class="epg-item ${idx===0?"agora":""}"><div class="epg-time">${sT}<span>${eT}</span></div><div class="epg-info"><div class="epg-title">${title}</div><div class="epg-desc" title="${desc}">${desc}</div></div></div>`; }); reativarFocoTV(); }

function prepararCategoriasQuickNav() { let tipoDaLista = tipoMidiaAtiva === 'tv' ? 'tv' : abaAtivaGlobal; if(tipoDaLista === 'home') tipoDaLista = 'tv'; let filtrados = filtrarAdultos(listaCanaisAtiva); const itensAba = filtrados.filter(c => c.tipo === tipoDaLista); let contCat = {}; itensAba.forEach(i => { contCat[i.categoria] = (contCat[i.categoria] || 0) + 1; }); const catOrdem = Object.keys(contCat).sort((a, b) => { if (tipoDaLista === "tv") { let iA = ORDEM_FIXA_TV.indexOf(a), iB = ORDEM_FIXA_TV.indexOf(b); if (iA === -1) iA = 9999; if (iB === -1) iB = 9999; return iA === iB ? a.localeCompare(b) : iA - iB; } else { return a.localeCompare(b); } }); qnCategorias = ["Todos", "Recentes", "Favoritos", "ContinuarAssistindo"].concat(catOrdem); qnCategoriaIndex = qnCategorias.indexOf(categorySelectedGlobal); if(qnCategoriaIndex === -1) qnCategoriaIndex = 0; }
function mudarCategoriaQuickNav(direcao) { if (qnCategorias.length === 0) prepararCategoriasQuickNav(); qnCategoriaIndex += direcao; if(qnCategoriaIndex < 0) qnCategoriaIndex = qnCategorias.length - 1; if(qnCategoriaIndex >= qnCategorias.length) qnCategoriaIndex = 0; let nCat = qnCategorias[qnCategoriaIndex]; document.getElementById('quick-nav-cat-name').innerText = nCat === "ContinuarAssistindo" ? "Continuar Assistindo" : nCat; let fatiado = []; let filtrados = filtrarAdultos(listaCanaisAtiva); if (nCat === "Todos") { fatiado = filtrados.filter(c => c.tipo === (tipoMidiaAtiva === 'tv' ? 'tv' : abaAtivaGlobal)).slice(0, 100); } else if (nCat === "Favoritos") { let favs = JSON.parse(localStorage.getItem('iptv_favoritos_tv') || '[]'); fatiado = filtrados.filter(c => c.tipo === 'tv' && favs.includes(String(c.id))).slice(0, 100); } else if (nCat === "Recentes") { let recs = JSON.parse(localStorage.getItem('iptv_recentes_tv') || '[]'); recs.forEach(rid => { let ac = filtrados.find(c => String(c.id) === String(rid) && c.tipo === 'tv'); if(ac) fatiado.push(ac); }); fatiado = fatiado.slice(0, 100); } else if (nCat === "ContinuarAssistindo") { let cont = JSON.parse(localStorage.getItem('iptv_continuar_vod') || '[]'); cont.forEach(i => { let ac = filtrados.find(c => String(c.id) === String(i.id) && c.tipo === tipoMidiaAtiva); if(ac) fatiado.push(ac); }); fatiado = fatiado.slice(0, 100); } else { fatiado = filtrados.filter(c => c.categoria === nCat && c.tipo === (tipoMidiaAtiva === 'tv' ? 'tv' : abaAtivaGlobal)).slice(0, 100); } const lista = document.getElementById('quick-nav-list'); lista.innerHTML = ""; if(fatiado.length === 0){ lista.innerHTML = `<p style="text-align:center; color:var(--text-muted); margin-top:20px;">Vazio.</p>`; return; } fatiado.forEach((item, idx) => { let logoSegura = processarLogoSegura(item.logo); let imgHtml = `<div class="quick-nav-thumb">${obterHTMLImagemSegura(logoSegura, item.tipo, true)}</div>`; let classeAtiva = (item.streamUrl === urlSintonizadaAtiva) ? 'ativo' : ''; let iconePlay = classeAtiva ? '<i class="fa-solid fa-play" style="color:var(--accent-yellow); margin-right:10px;"></i>' : '<i class="fa-solid fa-play" style="color:rgba(255,255,255,0.2); margin-right:10px;"></i>'; let epgDescHtml = ""; if (item.tipo === 'tv' && item.epg_title) { let descEPG = safeDecodeBase64(item.epg_title); if(descEPG) epgDescHtml = `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><i class="fa-solid fa-play" style="font-size:0.6rem;"></i> ${descEPG}</div>`; } lista.innerHTML += `<button class="quick-nav-item sn-focusable ${classeAtiva}" onclick="pularParaItemDeOutraPasta('${item.streamUrl}', '${encodeURIComponent(item.nome)}', '${item.id}', '${item.tipo}', '${nCat}', ${idx})">${imgHtml}<div style="flex: 1; overflow: hidden;"><div class="quick-nav-item-title">${item.nome}</div>${epgDescHtml}</div>${iconePlay}</button>`; }); reativarFocoTV(); }

function pularParaItemDeOutraPasta(url, nome, id, tipo, catNova, idx) { fecharModalFosco(); roteadorMultiplataformaPlayer(url, decodeURIComponent(nome), id, tipo, idx, catNova); }
function abrirModalNavegacao() { document.getElementById('quick-nav-modal').classList.add('open'); document.getElementById('player-controls-wrap').classList.add('fade-out'); if (tipoMidiaAtiva === 'serie') { document.getElementById('quick-nav-category-switcher').classList.add('escondido'); const lista = document.getElementById('quick-nav-list'); lista.innerHTML = ""; listaDeReproducaoGlobal.forEach((item, idx) => { let logoSegura = processarLogoSegura(item.logo); let imgHtml = `<div class="quick-nav-thumb">${obterHTMLImagemSegura(logoSegura, 'serie', true)}</div>`; let cl = (idx === indicePlaylistGlobal) ? 'ativo' : ''; let iconePlay = cl ? '<i class="fa-solid fa-play" style="color:var(--accent-yellow); margin-right:10px;"></i>' : '<i class="fa-solid fa-play" style="color:rgba(255,255,255,0.2); margin-right:10px;"></i>'; lista.innerHTML += `<button class="quick-nav-item sn-focusable ${cl}" onclick="pularParaIndiceNavegacaoSerie(${idx})">${imgHtml}<div class="quick-nav-item-title">${item.nome}</div>${iconePlay}</button>`; }); } else { document.getElementById('quick-nav-category-switcher').classList.remove('escondido'); prepararCategoriasQuickNav(); mudarCategoriaQuickNav(0); } setTimeout(() => { const ativo = document.querySelector('.quick-nav-modal .quick-nav-item.ativo'); if (ativo) ativo.scrollIntoView({ behavior: 'smooth', block: 'center' }); reativarFocoTV(); }, 300); }
function pularParaIndiceNavegacaoSerie(idx) { fecharModalFosco(); let p = listaDeReproducaoGlobal[idx]; roteadorMultiplataformaPlayer(p.streamUrl, encodeURIComponent(p.nome), p.id, p.tipo, idx); }
function fecharModalFosco() { document.getElementById('quick-nav-modal').classList.remove('open'); document.getElementById('epg-modal').classList.remove('open'); resetarTimerControlesUI(); }

// ============================================================================
// 🎮 CONTROLE DE VOLUME, TECLADO E CONTROLE REMOTO DA TV
// ============================================================================
let volumeSalvo = 1;
function mudarVolumeCinema(val) { const v = document.getElementById('video-player-elemento'); const icone = document.querySelector('#btn-mute-cinema i'); v.volume = val; v.muted = false; if(val == 0) { icone.className = "fa-solid fa-volume-xmark"; } else if(val < 0.5) { icone.className = "fa-solid fa-volume-low"; } else { icone.className = "fa-solid fa-volume-high"; } }
function toggarMudoCinema() { const v = document.getElementById('video-player-elemento'); const slider = document.getElementById('volume-slider-cinema'); const icone = document.querySelector('#btn-mute-cinema i'); if (v.muted || v.volume === 0) { v.muted = false; v.volume = volumeSalvo > 0 ? volumeSalvo : 1; slider.value = v.volume; icone.className = v.volume < 0.5 ? "fa-solid fa-volume-low" : "fa-solid fa-volume-high"; } else { volumeSalvo = v.volume; v.muted = true; v.volume = 0; slider.value = 0; icone.className = "fa-solid fa-volume-xmark"; } }

document.addEventListener('keydown', (e) => {
    const playerAberto = !document.getElementById('player-cinema-modal').classList.contains('escondido');
    if (e.keyCode === 27 || e.keyCode === 8 || e.keyCode === 10009 || e.keyCode === 461) {
        e.preventDefault(); 
        if (document.getElementById('epg-modal').classList.contains('open') || document.getElementById('quick-nav-modal').classList.contains('open')) { fecharModalFosco(); } 
        else if (playerAberto) { fecharPlayerCinema(); } 
        else if (viewAtivaGlobal === "canais" || viewAtivaGlobal === "detalhes") { voltarParaDashboard(); } 
        else { fecharModais(); }
        return;
    }
    if (playerAberto) {
        resetarTimerControlesUI(); 
        if (e.keyCode === 32 || e.keyCode === 179) { e.preventDefault(); toggarReproducaoCinema(); } 
        else if (e.keyCode === 39) { const v = document.getElementById('video-player-elemento'); if (v.duration) v.currentTime += 10; } 
        else if (e.keyCode === 37) { const v = document.getElementById('video-player-elemento'); if (v.duration) v.currentTime -= 10; } 
        else if (e.keyCode === 427 || e.keyCode === 33) { reproduzirProximoItem(); } 
        else if (e.keyCode === 428 || e.keyCode === 34) { reproduzirItemAnterior(); } 
    }
});

async function travarRotacaoLandscape() { try { if (screen.orientation && screen.orientation.lock) { await screen.orientation.lock('landscape'); estadoRotacaoPaisagem = true; } } catch (e) { } }
async function liberarRotacaoPortrait() { try { if (screen.orientation && screen.orientation.unlock) { screen.orientation.unlock(); estadoRotacaoPaisagem = false; } } catch (e) {} }
async function toggarGiroDeTelaAPI() { const m = document.getElementById('player-cinema-modal'); try { if (!estadoRotacaoPaisagem) { await screen.orientation.lock('landscape'); estadoRotacaoPaisagem = true; m.classList.remove('rotated-landscape'); } else { await screen.orientation.lock('portrait'); estadoRotacaoPaisagem = false; } } catch (e) { telaRotacionadaPaisagem = !telaRotacionadaPaisagem; if (telaRotacionadaPaisagem) m.classList.add('rotated-landscape'); else m.classList.remove('rotated-landscape'); } }
function reproduzirProximoItem() { if(indicePlaylistGlobal === -1 || indicePlaylistGlobal >= listaDeReproducaoGlobal.length - 1) return; let p = listaDeReproducaoGlobal[indicePlaylistGlobal + 1]; roteadorMultiplataformaPlayer(p.streamUrl, encodeURIComponent(p.nome), p.id, p.tipo, indicePlaylistGlobal + 1); }
function reproduzirItemAnterior() { if(indicePlaylistGlobal <= 0) return; let a = listaDeReproducaoGlobal[indicePlaylistGlobal - 1]; roteadorMultiplataformaPlayer(a.streamUrl, encodeURIComponent(a.nome), a.id, a.tipo, indicePlaylistGlobal - 1); }
function atualizarBotoesPlaylist() { const bA = document.getElementById('btn-player-anterior'), bP = document.getElementById('btn-player-proximo'); if(indicePlaylistGlobal <= 0) { bA.classList.add('disabled'); } else { bA.classList.remove('disabled'); } if(indicePlaylistGlobal >= listaDeReproducaoGlobal.length - 1 || indicePlaylistGlobal === -1) { bP.classList.add('disabled'); } else { bP.classList.remove('disabled'); } if(document.getElementById('quick-nav-modal').classList.contains('open') && tipoMidiaAtiva === 'serie') abrirModalNavegacao(); }

function configurarMotorDeGestos() { const z = document.getElementById('gesture-zone'); let sX = 0, sY = 0; z.addEventListener('touchstart', e => { sX = e.touches[0].clientX; sY = e.touches[0].clientY; }); z.addEventListener('touchend', e => { let dX = e.changedTouches[0].clientX - sX, dY = e.changedTouches[0].clientY - sY; if(Math.max(Math.abs(dX), Math.abs(dY)) < 40) { resetarTimerControlesUI(); return; } if(Math.abs(dY) > Math.abs(dX)) { if(dY > 50) abrirModalNavegacao(); else if(dY < -50) fecharModalFosco(); } else { if(dX > 60) { reproduzirItemAnterior(); } else if (dX < -60) { reproduzirProximoItem(); } } }); z.addEventListener('mousemove', resetarTimerControlesUI); }
function mostrarAvisoGesto(txt) { const f = document.getElementById('gesture-feedback'); f.innerText = txt; f.style.opacity = "1"; setTimeout(() => { f.style.opacity = "0"; }, 1000); }
function resetarTimerControlesUI() { const c = document.getElementById('player-controls-wrap'), h = document.getElementById('player-header-wrap'); c.classList.remove('fade-out'); h.classList.remove('fade-out'); clearTimeout(timerControles); timerControles = setTimeout(() => { if(!document.getElementById('video-player-elemento').paused && !document.getElementById('quick-nav-modal').classList.contains('open') && !document.getElementById('epg-modal').classList.contains('open')) { c.classList.add('fade-out'); h.classList.add('fade-out'); } }, 3500); }

function configurarMonitoramentoPlayerPC() { const v = document.getElementById('video-player-elemento'), o = document.getElementById('player-buffer-overlay'); v.addEventListener('waiting', () => { o.classList.remove('escondido'); }); v.addEventListener('playing', () => { o.classList.add('escondido'); resetarTimerControlesUI(); }); v.addEventListener('canplay', () => { o.classList.add('escondido'); if (!temProgressoAnterior && (tipoMidiaAtiva === 'filme' || tipoMidiaAtiva === 'serie')) { let d = JSON.parse(localStorage.getItem('iptv_continuar_vod') || '[]'); let r = d.find(i => String(i.id) === String(idMidiaAtiva)); if(r && r.tempo > 5) v.currentTime = r.tempo; temProgressoAnterior = true; } }); v.addEventListener('timeupdate', () => { if(v.duration) { document.getElementById('timeline-filled-cinema').style.width = `${(v.currentTime / v.duration) * 100}%`; if(v.currentTime > 5 && !v.paused && (tipoMidiaAtiva === 'filme' || tipoMidiaAtiva === 'serie')) salvarProgressoVOD(idMidiaAtiva, tipoMidiaAtiva, v.currentTime); } document.getElementById('player-time-text-cinema').innerText = `${formatarTempo(v.currentTime)} / ${formatarTempo(v.duration || 0)}`; }); v.addEventListener('play', () => document.getElementById('btn-play-pause-cinema').innerHTML = `<i class="fa-solid fa-pause"></i>`); v.addEventListener('pause', () => document.getElementById('btn-play-pause-cinema').innerHTML = `<i class="fa-solid fa-play"></i>`); }
function formatarTempo(s) { if(isNaN(s) || !isFinite(s)) return "00:00:00"; let h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`; }

function fecharPlayerCinema() { liberarRotacaoPortrait(); fecharModalFosco(); document.getElementById('player-cinema-modal').classList.remove('rotated-landscape'); document.getElementById('video-player-elemento').pause(); document.getElementById('video-player-elemento').src = ""; if(window.hlsP) { window.hlsP.destroy(); window.hlsP = null; } if (document.fullscreenElement || document.webkitFullscreenElement) { if(document.exitFullscreen) document.exitFullscreen().catch(e=>{}); else if(document.webkitExitFullscreen) document.webkitExitFullscreen().catch(e=>{}); } document.getElementById('player-cinema-modal').classList.add('escondido'); if(viewAtivaGlobal === "detalhes") { let btnPlay = document.getElementById('btn-play-filme'); let d = JSON.parse(localStorage.getItem('iptv_continuar_vod') || '[]'); let r = d.find(i => String(i.id) === String(idMidiaAtiva)); if (r && r.tempo > 5) { btnPlay.innerHTML = `<i class="fa-solid fa-play"></i> CONTINUAR ASSISTINDO`; } } else if (abaAtivaGlobal === "home") { renderizarDashboardHome(); } else { renderizarCanais(false); } }
function dispararComoIntentNativa() { if(!urlSintonizadaAtiva) return; let intentUrl = urlSintonizadaAtiva; if(tipoMidiaAtiva === 'tv' && intentUrl.endsWith('.m3u8')) intentUrl = intentUrl.slice(0, -5) + '.ts'; const p = intentUrl.split('://'); if(p.length !== 2) return; document.getElementById('video-player-elemento').pause(); fecharPlayerCinema(); window.location.href = `intent://${p[1]}#Intent;action=android.intent.action.VIEW;scheme=${p[0]};type=video/*;S.title=${encodeURIComponent(nomeMidiaAtiva)};end;`; }
function toggarTelaCheiaCinema() { const c = document.getElementById('player-cinema-modal'); if(!document.fullscreenElement && !document.webkitFullscreenElement) { if(c.requestFullscreen) c.requestFullscreen().catch(e=>{}); else if(c.webkitRequestFullscreen) c.webkitRequestFullscreen().catch(e=>{}); } else { if(document.exitFullscreen) document.exitFullscreen().catch(e=>{}); else if(document.webkitExitFullscreen) document.webkitExitFullscreen().catch(e=>{}); } }
