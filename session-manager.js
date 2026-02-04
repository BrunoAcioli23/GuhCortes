// ============================================
// CONTROLE DE SESSÃO E AUTENTICAÇÃO
// ============================================

let auth;
let db;
let storage;
let currentUser = null;
let currentBarbearia = null;
let currentBarbeariaId = null;
let activePlan = null;
let activeModules = [];

// Inicializar autenticação
function initializeAuth() {
    return new Promise((resolve, reject) => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            auth = firebase.auth();
            
            auth.onAuthStateChanged(async (user) => {
                if (!user) {
                    // Não está logado, redirecionar para login
                    window.location.href = 'login.html';
                    reject('Usuário não autenticado');
                    return;
                }
                
                currentUser = user;
                currentBarbeariaId = user.uid;
                
                // Verificar se existe sessão local
                const cachedBarbeariaId = localStorage.getItem('barbeariaId');
                const cachedPlano = localStorage.getItem('barbeariaPlano');
                
                if (cachedBarbeariaId && cachedPlano) {
                    // Carregar dados do cache
                    activePlan = cachedPlano;
                    await loadBarbeariaFromCache();
                    resolve(currentBarbearia);
                } else {
                    // Carregar dados do Firestore
                    await loadBarbeariaData();
                    resolve(currentBarbearia);
                }
            });
        } else {
            reject('Firebase não configurado');
        }
    });
}

// Carregar dados da barbearia do Firestore
async function loadBarbeariaData() {
    try {
        const barbeariaDoc = await db.collection('barbearias').doc(currentBarbeariaId).get();
        
        if (!barbeariaDoc.exists) {
            console.error('Barbearia não encontrada');
            window.location.href = 'select-plan.html';
            return;
        }
        
        currentBarbearia = barbeariaDoc.data();
        currentBarbearia.id = currentBarbeariaId; // Adicionar ID para referência
        activePlan = currentBarbearia.plano || 'inicial';
        activeModules = currentBarbearia.modulosAtivos || ['dashboard', 'servicos', 'atendimentos'];
        
        // Salvar no cache
        localStorage.setItem('barbeariaId', currentBarbeariaId);
        localStorage.setItem('barbeariaNome', currentBarbearia.nome);
        localStorage.setItem('barbeariaPlano', activePlan);
        
        if (currentBarbearia.logoUrl) {
            localStorage.setItem('barbeariaLogo', currentBarbearia.logoUrl);
        }
        
        // Atualizar UI com dados da barbearia
        updateUIWithBarbeariaData();
        
        // Verificar permissões de módulos
        checkModulePermissions();
        
        console.log('✅ Dados da barbearia carregados:', currentBarbearia.nome);
        console.log('📦 Plano ativo:', activePlan);
        console.log('🧩 Módulos ativos:', activeModules);
        console.log('🔧 Serviços carregados:', currentBarbearia.servicos?.length || 0);
        console.log('👥 Clientes carregados:', currentBarbearia.clientes?.length || 0);
        
    } catch (error) {
        console.error('Erro ao carregar dados da barbearia:', error);
    }
}

// Carregar dados do cache
async function loadBarbeariaFromCache() {
    // Buscar dados completos do Firestore (inclui serviços, clientes, produtos)
    try {
        const barbeariaDoc = await db.collection('barbearias').doc(currentBarbeariaId).get();
        
        if (barbeariaDoc.exists) {
            currentBarbearia = barbeariaDoc.data();
            currentBarbearia.id = currentBarbeariaId;
            activePlan = currentBarbearia.plano || localStorage.getItem('barbeariaPlano') || 'inicial';
            
            console.log('✅ Dados completos carregados do Firestore');
            console.log('🔧 Serviços:', currentBarbearia.servicos?.length || 0);
            console.log('👥 Clientes:', currentBarbearia.clientes?.length || 0);
        } else {
            // Fallback para dados do cache se Firestore falhar
            currentBarbearia = {
                id: currentBarbeariaId,
                nome: localStorage.getItem('barbeariaNome'),
                logoUrl: localStorage.getItem('barbeariaLogo'),
                plano: localStorage.getItem('barbeariaPlano'),
                servicos: [],
                clientes: [],
                produtos: []
            };
            
            activePlan = currentBarbearia.plano;
            console.log('⚠️ Usando dados do cache (sem serviços/clientes)');
        }
    } catch (error) {
        console.error('Erro ao carregar do Firestore, usando cache:', error);
        // Fallback para dados básicos do cache
        currentBarbearia = {
            id: currentBarbeariaId,
            nome: localStorage.getItem('barbeariaNome'),
            logoUrl: localStorage.getItem('barbeariaLogo'),
            plano: localStorage.getItem('barbeariaPlano'),
            servicos: [],
            clientes: [],
            produtos: []
        };
        
        activePlan = currentBarbearia.plano;
    }
    
    // Definir módulos baseado no plano
    if (activePlan === 'platinum') {
        activeModules = ['dashboard', 'servicos', 'atendimentos', 'produtos', 'agendamento'];
    } else {
        activeModules = ['dashboard', 'servicos', 'atendimentos', 'produtos'];
    }
    
    updateUIWithBarbeariaData();
    checkModulePermissions();
}

// Atualizar interface com dados da barbearia
function updateUIWithBarbeariaData() {
    // Atualizar nome da barbearia no header
    const headerNome = document.getElementById('headerNome');
    if (headerNome && currentBarbearia.nome) {
        headerNome.textContent = currentBarbearia.nome;
    }
    
    // Atualizar logo (só exibir se existir)
    const headerLogo = document.getElementById('headerLogo');
    if (headerLogo && currentBarbearia.logoUrl) {
        headerLogo.src = currentBarbearia.logoUrl;
        headerLogo.style.display = 'block';
    } else if (headerLogo) {
        headerLogo.style.display = 'none';
    }
    
    // Atualizar plano no header
    const headerPlano = document.getElementById('headerPlano');
    if (headerPlano && currentBarbearia) {
        const planoNome = currentBarbearia.planoNome || 'Plano Inicial';
        headerPlano.textContent = planoNome;
    }
}

// Verificar permissões de módulos
function checkModulePermissions() {
    // Verificar se a aba de agendamento deve estar visível
    const agendamentoTab = document.querySelector('[data-tab="agendamento"]');
    
    if (agendamentoTab) {
        if (!hasModuleAccess('agendamento')) {
            agendamentoTab.style.display = 'none';
        } else {
            agendamentoTab.style.display = 'block';
        }
    }
}

// Verificar se tem acesso a um módulo
function hasModuleAccess(moduleName) {
    return activeModules.includes(moduleName);
}

// Exibir menu do usuário
function showUserMenu() {
    const options = [
        '1. Configurações da Barbearia',
        '2. Alterar Plano',
        '3. Sair',
        '4. Cancelar'
    ];
    
    const choice = prompt(options.join('\n'));
    
    switch (choice) {
        case '1':
            window.location.href = 'config.html';
            break;
        case '2':
            window.location.href = 'select-plan.html';
            break;
        case '3':
            logout();
            break;
        default:
            break;
    }
}

// Fazer logout
async function logout() {
    const confirmLogout = confirm('Deseja realmente sair?');
    
    if (!confirmLogout) return;
    
    try {
        await auth.signOut();
        localStorage.clear();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        alert('Erro ao sair. Tente novamente.');
    }
}

// Verificar se módulo está disponível antes de executar ação
function requireModule(moduleName, callback) {
    if (!hasModuleAccess(moduleName)) {
        const planName = activePlan === 'inicial' ? 'Pacote Inicial' : 'Platinum';
        alert(`Este recurso não está disponível no seu plano (${planName}).\n\nFaça upgrade para o plano Platinum para acessar este módulo.`);
        
        const upgrade = confirm('Deseja fazer upgrade agora?');
        if (upgrade) {
            window.location.href = 'select-plan.html';
        }
        return false;
    }
    
    if (callback) {
        callback();
    }
    
    return true;
}
