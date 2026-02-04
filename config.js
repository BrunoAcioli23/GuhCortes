// ============================================
// CONFIGURAÇÃO DA BARBEARIA
// ============================================

// Variáveis já declaradas em session-manager.js: auth, db, currentUser
// Apenas declarar novas variáveis específicas desta página
let uploadedLogoFile = null;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        // Inicializar serviços do Firebase se ainda não foram
        if (!auth) auth = firebase.auth();
        if (!db) db = firebase.firestore();
        if (!storage) storage = firebase.storage();
        
        // Verificar autenticação e carregar dados
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = 'login.html';
                return;
            }
            
            currentUser = user;
            await loadBarbeariaData();
            setupEventListeners();
        });
    }
});

// ============================================
// CARREGAR DADOS DA BARBEARIA
// ============================================

async function loadBarbeariaData() {
    try {
        console.log('📥 Carregando dados da barbearia...');
        
        const barbeariaDoc = await db.collection('barbearias').doc(currentUser.uid).get();
        
        if (!barbeariaDoc.exists) {
            console.error('❌ Dados da barbearia não encontrados');
            return;
        }
        
        const barbearia = barbeariaDoc.data();
        console.log('✅ Dados carregados:', barbearia);
        
        // Preencher informações do plano
        displayPlanInfo(barbearia);
        
        // Atualizar header com nome da barbearia
        const headerNome = document.getElementById('headerNome');
        if (headerNome && barbearia.nome) {
            headerNome.textContent = barbearia.nome;
        }
        
        // Atualizar logo no header se existir
        const headerLogo = document.getElementById('headerLogo');
        if (headerLogo && barbearia.logoUrl) {
            headerLogo.src = barbearia.logoUrl;
            headerLogo.style.display = 'block';
        }
        
        // Preencher formulário com dados existentes
        document.getElementById('barbeariaNome').value = barbearia.nome || '';
        document.getElementById('barbeariaEndereco').value = barbearia.endereco || '';
        document.getElementById('barbeariaTelefone').value = barbearia.telefone || '';
        document.getElementById('barbeariaInstagram').value = barbearia.instagram || '';
        document.getElementById('barbeariaDescricao').value = barbearia.descricao || '';
        
        // Exibir logo se existir
        if (barbearia.logoUrl) {
            displayLogo(barbearia.logoUrl);
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        alert('Erro ao carregar dados da barbearia.');
    }
}

// ============================================
// EXIBIR INFORMAÇÕES DO PLANO
// ============================================

function displayPlanInfo(barbearia) {
    const planBadge = document.getElementById('planBadge');
    const planDescription = document.getElementById('planDescription');
    const planModulesList = document.getElementById('planModulesList');
    
    // Buscar informações do plano
    const planoId = barbearia.plano || 'inicial';
    const planoNome = barbearia.planoNome || 'Plano Inicial';
    const planoValor = barbearia.planoValor !== undefined ? barbearia.planoValor : 34.90;
    const modulos = barbearia.modulosAtivos || ['dashboard', 'servicos', 'atendimentos'];
    
    // Atualizar badge do plano
    if (planBadge) {
        planBadge.textContent = planoNome;
        planBadge.className = 'plan-badge';
        
        // Adicionar classe baseada no plano
        if (planoId === 'premium' || planoId === 'completo') {
            planBadge.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
        } else if (planoId === 'profissional') {
            planBadge.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        }
    }
    
    // Atualizar descrição com valor
    if (planDescription) {
        planDescription.textContent = `R$ ${planoValor.toFixed(2)}/mês`;
    }
    
    // Lista de módulos disponíveis
    const modulosNomes = {
        dashboard: 'Dashboard Completo',
        servicos: 'Gestão de Serviços',
        atendimentos: 'Registro de Atendimentos',
        produtos: 'Gestão de Produtos',
        agendamento: 'Sistema de Agendamento',
        relatorios: 'Relatórios Avançados',
        financeiro: 'Controle Financeiro',
        clientes: 'Gestão de Clientes'
    };
    
    // Renderizar lista de módulos
    if (planModulesList) {
        planModulesList.innerHTML = modulos.map(mod => 
            `<li><span style="color: var(--color-success); margin-right: 0.5rem;">✓</span>${modulosNomes[mod] || mod}</li>`
        ).join('');
    }
    
    // Atualizar header com plano
    const headerPlano = document.getElementById('headerPlano');
    if (headerPlano) {
        headerPlano.textContent = planoNome;
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Upload de logo
    const logoInput = document.getElementById('logoInput');
    logoInput.addEventListener('change', handleLogoSelect);
    
    // Submissão do formulário
    const configForm = document.getElementById('configForm');
    configForm.addEventListener('submit', handleConfigSubmit);
}

// ============================================
// UPLOAD DE LOGO
// ============================================

function handleLogoSelect(e) {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione uma imagem.');
        return;
    }
    
    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 2MB.');
        return;
    }
    
    uploadedLogoFile = file;
    
    // Preview da imagem
    const reader = new FileReader();
    reader.onload = (e) => {
        displayLogo(e.target.result);
    };
    reader.readAsDataURL(file);
}

function displayLogo(url) {
    const logoPreview = document.getElementById('logoPreview');
    logoPreview.innerHTML = `<img src="${url}" alt="Logo">`;
}

async function uploadLogo() {
    if (!uploadedLogoFile) {
        return null;
    }
    
    try {
        console.log('📷 Fazendo upload da logo...');
        
        const fileName = `logos/${currentUser.uid}_${Date.now()}.${uploadedLogoFile.name.split('.').pop()}`;
        const storageRef = storage.ref(fileName);
        
        // Upload do arquivo
        const uploadTask = await storageRef.put(uploadedLogoFile);
        console.log('✅ Upload concluído!');
        
        // Obter URL de download
        const downloadURL = await storageRef.getDownloadURL();
        console.log('🔗 URL da logo:', downloadURL);
        
        return downloadURL;
    } catch (error) {
        console.error('❌ Erro ao fazer upload da logo:', error);
        throw error;
    }
}

// ============================================
// SALVAR CONFIGURAÇÕES
// ============================================

async function handleConfigSubmit(e) {
    e.preventDefault();
    
    const nome = document.getElementById('barbeariaNome').value.trim();
    const endereco = document.getElementById('barbeariaEndereco').value.trim();
    const telefone = document.getElementById('barbeariaTelefone').value.trim();
    const instagram = document.getElementById('barbeariaInstagram').value.trim();
    const descricao = document.getElementById('barbeariaDescricao').value.trim();
    
    if (!nome) {
        alert('O nome da barbearia é obrigatório.');
        return;
    }
    
    try {
        // Desabilitar botão
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Salvando...';
        
        // Buscar dados atuais da barbearia para preservar logoUrl existente
        const barbeariaDoc = await db.collection('barbearias').doc(currentUser.uid).get();
        const barbeariaAtual = barbeariaDoc.data() || {};
        
        // Fazer upload da logo se houver nova
        let logoUrl = barbeariaAtual.logoUrl || null; // Preservar logo existente
        if (uploadedLogoFile) {
            console.log('📷 Nova logo detectada, fazendo upload...');
            logoUrl = await uploadLogo();
            console.log('✅ Logo salva com sucesso:', logoUrl);
        }
        
        // Preparar dados para atualização
        const updateData = {
            nome,
            endereco,
            telefone,
            instagram,
            descricao,
            configurado: true,
            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Adicionar logo URL aos dados (seja nova ou existente)
        if (logoUrl) {
            updateData.logoUrl = logoUrl;
            console.log('🖼️ Logo URL adicionada aos dados:', logoUrl);
        }
        
        // Atualizar no Firestore
        console.log('💾 Salvando configurações no Firestore...');
        await db.collection('barbearias').doc(currentUser.uid).update(updateData);
        console.log('✅ Configurações salvas com sucesso!');
        
        // Atualizar localStorage
        localStorage.setItem('barbeariaNome', nome);
        if (logoUrl) {
            localStorage.setItem('barbeariaLogo', logoUrl);
        }
        
        alert('✅ Configurações salvas com sucesso!');
        
        // Redirecionar para o sistema
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('❌ Erro ao salvar configurações:', error);
        alert('❌ Erro ao salvar configurações: ' + error.message);
        
        // Reabilitar botão
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar Configurações';
    }
}
