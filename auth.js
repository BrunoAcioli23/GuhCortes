// ============================================
// AUTENTICAÇÃO E GERENCIAMENTO DE USUÁRIOS
// ============================================

let auth;
let db;

// Inicializar quando DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        auth = firebase.auth();
        db = firebase.firestore();
        
        // Verificar se já está logado
        checkAuthState();
        
        // Configurar event listeners
        setupAuthEventListeners();
    } else {
        showMessage('Erro ao conectar com o Firebase. Verifique sua conexão.', 'error');
    }
});

// ============================================
// VERIFICAÇÃO DE AUTENTICAÇÃO
// ============================================

function checkAuthState() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('✅ Usuário logado:', user.email);
            
            // Buscar dados da barbearia
            try {
                const barbeariaDoc = await db.collection('barbearias').doc(user.uid).get();
                
                if (barbeariaDoc.exists) {
                    const barbearia = barbeariaDoc.data();
                    
                    // Salvar sessão localmente
                    localStorage.setItem('userId', user.uid);
                    localStorage.setItem('userEmail', user.email);
                    localStorage.setItem('barbeariaId', user.uid);
                    localStorage.setItem('barbeariaNome', barbearia.nome);
                    localStorage.setItem('barbeariaPlano', barbearia.plano || 'inicial');
                    
                    // Redirecionar para o app
                    window.location.href = 'index.html';
                } else {
                    // Barbearia não configurada, redirecionar para seleção de plano
                    window.location.href = 'select-plan.html';
                }
            } catch (error) {
                console.error('Erro ao buscar dados da barbearia:', error);
                showMessage('Erro ao carregar dados. Tente novamente.', 'error');
            }
        }
    });
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupAuthEventListeners() {
    // Alternar entre login e cadastro
    const showRegisterBtn = document.getElementById('showRegister');
    const showLoginBtn = document.getElementById('showLogin');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            clearMessage();
        });
    }
    
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
            clearMessage();
        });
    }
    
    // Submeter formulário de login
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Submeter formulário de cadastro
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

// ============================================
// FUNÇÕES DE LOGIN E CADASTRO
// ============================================

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showMessage('Preencha todos os campos.', 'error');
        return;
    }
    
    try {
        showMessage('Entrando...', 'success');
        await auth.signInWithEmailAndPassword(email, password);
        // O redirecionamento será feito automaticamente pelo checkAuthState
    } catch (error) {
        console.error('Erro no login:', error);
        
        let errorMessage = 'Erro ao fazer login. Tente novamente.';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Usuário não encontrado.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Senha incorreta.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'E-mail inválido.';
        }
        
        showMessage(errorMessage, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const barbeariaName = document.getElementById('registerBarbeariaName').value.trim();
    const ownerName = document.getElementById('registerOwnerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    
    // Validações
    if (!barbeariaName || !ownerName || !email || !password || !passwordConfirm) {
        showMessage('Preencha todos os campos.', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('A senha deve ter no mínimo 6 caracteres.', 'error');
        return;
    }
    
    if (password !== passwordConfirm) {
        showMessage('As senhas não coincidem.', 'error');
        return;
    }
    
    try {
        showMessage('Criando conta...', 'success');
        
        // Criar usuário no Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Criar documento da barbearia (sem plano ainda)
        await db.collection('barbearias').doc(user.uid).set({
            nome: barbeariaName,
            proprietario: ownerName,
            email: email,
            plano: null, // Será definido na próxima etapa
            dataCriacao: firebase.firestore.FieldValue.serverTimestamp(),
            ativo: true,
            logoUrl: null
        });
        
        showMessage('Conta criada com sucesso! Redirecionando...', 'success');
        
        // Redirecionar para seleção de plano
        setTimeout(() => {
            window.location.href = 'select-plan.html';
        }, 1500);
        
    } catch (error) {
        console.error('Erro no cadastro:', error);
        
        let errorMessage = 'Erro ao criar conta. Tente novamente.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Este e-mail já está em uso.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'E-mail inválido.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Senha muito fraca.';
        }
        
        showMessage(errorMessage, 'error');
    }
}

// ============================================
// FUNÇÃO DE LOGOUT
// ============================================

async function logout() {
    try {
        await auth.signOut();
        localStorage.clear();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    }
}

// ============================================
// MENSAGENS DE FEEDBACK
// ============================================

function showMessage(message, type = 'success') {
    const messageElement = document.getElementById('authMessage');
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = `auth-message show ${type}`;
    }
}

function clearMessage() {
    const messageElement = document.getElementById('authMessage');
    if (messageElement) {
        messageElement.className = 'auth-message';
        messageElement.textContent = '';
    }
}
