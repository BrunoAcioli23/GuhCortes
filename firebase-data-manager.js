// ============================================
// GERENCIAMENTO DE SERVIÇOS E PRODUTOS COM FIREBASE
// ============================================

// Função auxiliar para obter referência da collection da barbearia
function getBarbeariaCollection(collectionName) {
    if (!currentBarbeariaId) {
        console.error('ID da barbearia não disponível');
        return null;
    }
    
    return db.collection('barbearias')
        .doc(currentBarbeariaId)
        .collection(collectionName);
}

// ============================================
// SERVIÇOS
// ============================================

async function loadServicosFromFirestore() {
    try {
        const servicosRef = getBarbeariaCollection('servicos');
        if (!servicosRef) return [];
        
        const snapshot = await servicosRef.orderBy('nome').get();
        
        if (snapshot.empty) {
            console.log('📋 Nenhum serviço encontrado, inicializando serviços padrão...');
            await initializeDefaultServicesFirestore();
            return await loadServicosFromFirestore(); // Recarregar após inicializar
        }
        
        const servicos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log('✅ Serviços carregados:', servicos.length);
        return servicos;
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
        return [];
    }
}

async function initializeDefaultServicesFirestore() {
    const defaultServices = [
        { nome: 'Corte', valor: 0 },
        { nome: 'Sobrancelha', valor: 0 },
        { nome: 'Barba', valor: 0 }
    ];
    
    const servicosRef = getBarbeariaCollection('servicos');
    if (!servicosRef) return;
    
    const batch = db.batch();
    
    defaultServices.forEach(servico => {
        const docRef = servicosRef.doc();
        batch.set(docRef, servico);
    });
    
    await batch.commit();
    console.log('✅ Serviços padrão inicializados: Corte, Sobrancelha e Barba (R$ 0,00)');
}

async function addServicoFirestore(nome, valor) {
    try {
        const servicosRef = getBarbeariaCollection('servicos');
        if (!servicosRef) throw new Error('Referência da collection não disponível');
        
        await servicosRef.add({
            nome,
            valor,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Serviço adicionado:', nome);
        return true;
    } catch (error) {
        console.error('Erro ao adicionar serviço:', error);
        throw error;
    }
}

async function updateServicoFirestore(id, nome, valor) {
    try {
        const servicosRef = getBarbeariaCollection('servicos');
        if (!servicosRef) throw new Error('Referência da collection não disponível');
        
        await servicosRef.doc(id).update({
            nome,
            valor,
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Serviço atualizado:', id);
        return true;
    } catch (error) {
        console.error('Erro ao atualizar serviço:', error);
        throw error;
    }
}

async function deleteServicoFirestore(id) {
    try {
        const servicosRef = getBarbeariaCollection('servicos');
        if (!servicosRef) throw new Error('Referência da collection não disponível');
        
        await servicosRef.doc(id).delete();
        
        console.log('✅ Serviço deletado:', id);
        return true;
    } catch (error) {
        console.error('Erro ao deletar serviço:', error);
        throw error;
    }
}

// ============================================
// PRODUTOS
// ============================================

async function loadProdutosFromFirestore() {
    try {
        const produtosRef = getBarbeariaCollection('produtos');
        if (!produtosRef) return [];
        
        const snapshot = await produtosRef.orderBy('nome').get();
        
        if (snapshot.empty) {
            console.log('📦 Nenhum produto encontrado, inicializando produtos padrão...');
            await initializeDefaultProductsFirestore();
            return await loadProdutosFromFirestore(); // Recarregar após inicializar
        }
        
        const produtos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log('✅ Produtos carregados:', produtos.length);
        return produtos;
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        return [];
    }
}

async function initializeDefaultProductsFirestore() {
    const defaultProducts = [
        { nome: 'Cerveja', valor: 5 },
        { nome: 'Refrigerante', valor: 3 },
        { nome: 'Água', valor: 2 },
        { nome: 'Cera', valor: 15 },
        { nome: 'Pomada', valor: 20 }
    ];
    
    const produtosRef = getBarbeariaCollection('produtos');
    if (!produtosRef) return;
    
    const batch = db.batch();
    
    defaultProducts.forEach(produto => {
        const docRef = produtosRef.doc();
        batch.set(docRef, produto);
    });
    
    await batch.commit();
    console.log('✅ Produtos padrão inicializados');
}

async function addProdutoFirestore(nome, valor) {
    try {
        const produtosRef = getBarbeariaCollection('produtos');
        if (!produtosRef) throw new Error('Referência da collection não disponível');
        
        await produtosRef.add({
            nome,
            valor,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Produto adicionado:', nome);
        return true;
    } catch (error) {
        console.error('Erro ao adicionar produto:', error);
        throw error;
    }
}

async function updateProdutoFirestore(id, nome, valor) {
    try {
        const produtosRef = getBarbeariaCollection('produtos');
        if (!produtosRef) throw new Error('Referência da collection não disponível');
        
        await produtosRef.doc(id).update({
            nome,
            valor,
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Produto atualizado:', id);
        return true;
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        throw error;
    }
}

async function deleteProdutoFirestore(id) {
    try {
        const produtosRef = getBarbeariaCollection('produtos');
        if (!produtosRef) throw new Error('Referência da collection não disponível');
        
        await produtosRef.doc(id).delete();
        
        console.log('✅ Produto deletado:', id);
        return true;
    } catch (error) {
        console.error('Erro ao deletar produto:', error);
        throw error;
    }
}
