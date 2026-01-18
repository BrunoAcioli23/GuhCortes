// ============================================
// CONFIGURAÇÃO DO FIREBASE
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyArWqXC_cztreMeEJ5juqKpAsY4TBEIGMw",
    authDomain: "guhcortes-b5770.firebaseapp.com",
    projectId: "guhcortes-b5770",
    storageBucket: "guhcortes-b5770.firebasestorage.app",
    messagingSenderId: "266695093035",
    appId: "1:266695093035:web:c84b419f949e466570f36e",
    measurementId: "G-34MEL8FMNT"
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
