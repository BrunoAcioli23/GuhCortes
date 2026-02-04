// ============================================
// SELEÇÃO E CONFIGURAÇÃO DE PLANOS
// ============================================

let auth;
let db;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        auth = firebase.auth();
        db = firebase.firestore();
        
        // Verificar autenticação
        auth.onAuthStateChanged((user) => {
            if (!user) {
                // Não está logado, redirecionar para login
                window.location.href = 'login.html';
            }
        });
    }
});

// ============================================
// MÓDULOS POR PLANO
// ============================================

const PLAN_MODULES = {
    inicial: {
        nome: 'Plano Inicial',
        valor: 34.90,
        modulos: ['dashboard', 'servicos', 'atendimentos', 'produtos']
    },
    platinum: {
        nome: 'Platinum',
        valor: 69.90,
        modulos: ['dashboard', 'servicos', 'atendimentos', 'produtos', 'agendamento']
    },
    empresarial: {
        nome: 'Empresarial',
        valor: 139.90,
        modulos: ['dashboard', 'servicos', 'atendimentos', 'produtos', 'agendamento', 'equipe', 'unidades']
    }
};

// ============================================
// SELEÇÃO DE PLANO
// ============================================

async function selectPlan(planId, price) {
    const user = auth.currentUser;
    
    if (!user) {
        alert('Você precisa estar logado para selecionar um plano.');
        window.location.href = 'login.html';
        return;
    }
    
    const planInfo = PLAN_MODULES[planId];
    
    if (!planInfo) {
        alert('Plano inválido.');
        return;
    }
    
    // Confirmar seleção
    const confirmacao = confirm(
        `Confirma a seleção do plano "${planInfo.nome}" por R$ ${price.toFixed(2)}/mês?\n\n` +
        `Módulos inclusos:\n${planInfo.modulos.map(m => '• ' + m.charAt(0).toUpperCase() + m.slice(1)).join('\n')}`
    );
    
    if (!confirmacao) {
        return;
    }
    
    try {
        // Atualizar plano no Firestore
        await db.collection('barbearias').doc(user.uid).update({
            plano: planId,
            planoNome: planInfo.nome,
            planoValor: price,
            modulosAtivos: planInfo.modulos,
            planoDataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Atualizar localStorage
        localStorage.setItem('barbeariaPlano', planId);
        
        alert('Plano selecionado com sucesso! Agora configure sua barbearia.');
        
        // Redirecionar para configuração
        window.location.href = 'config.html';
        
    } catch (error) {
        console.error('Erro ao selecionar plano:', error);
        alert('Erro ao selecionar plano. Tente novamente.');
    }
}

// ============================================
// LOGOUT
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
