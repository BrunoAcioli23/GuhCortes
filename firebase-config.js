// ============================================
// CONFIGURAÇÃO DO FIREBASE
// ============================================

  const firebaseConfig = {
    apiKey: "AIzaSyAH-_zCpZ7Pb9405V7c3dFyJqsh3zWGUYY",
    authDomain: "effore-barber.firebaseapp.com",
    projectId: "effore-barber",
    storageBucket: "effore-barber.firebasestorage.app",
    messagingSenderId: "1049002743190",
    appId: "1:1049002743190:web:59d9fb71c8b4be88e4f9b7"
  };

// Inicializar Firebase
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase inicializado com sucesso!');
    } else {
        console.error('❌ Firebase SDK não carregado. Verifique a conexão com a internet.');
    }
} catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error);
    console.log('⚠️ O app funcionará em modo offline (localStorage)');
}
