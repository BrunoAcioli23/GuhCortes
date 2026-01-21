// ============================================
// CONFIGURAÇÃO E INICIALIZAÇÃO
// ============================================

let db;
let currentFilter = 'dia';
let customDateRange = null;

// Inicializar app quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    console.log('🚀 Inicializando aplicativo...');
    
    // Verificar se Firebase está configurado
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        db = firebase.firestore();
        console.log('✅ Firebase conectado com sucesso!');
        console.log('📊 Firestore pronto para uso');
    } else {
        console.warn('⚠️ Firebase não configurado. Usando modo offline (localStorage)');
        db = null;
    }
    
    // Configurar data atual no header
    updateCurrentDate();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Calcular valor total automaticamente
    setupServiceCalculation();
    
    // Configurar busca na tabela
    setupTableSearch();
    
    // Carregar dados iniciais
    loadDashboardData();
    
    // Carregar tabela de atendimentos
    loadAtendimentosTable();
    
    // Inicializar gerenciamento e carregar dados iniciais
    initializeGerenciar();
    
    // Atualizar grids de serviços e produtos (importante!)
    setTimeout(() => {
        updateServicesGrid();
        updateConsumoGrid();
    }, 100);
    
    console.log('✅ Aplicativo inicializado com sucesso!');
}

// ============================================
// DATA E HORA
// ============================================

function updateCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const today = new Date().toLocaleDateString('pt-BR', options);
    dateElement.textContent = today.charAt(0).toUpperCase() + today.slice(1);
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Formulário de atendimento
    const form = document.getElementById('atendimentoForm');
    form.addEventListener('submit', handleFormSubmit);
    
    // Botões de filtro
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            customDateRange = null;
            loadDashboardData();
        });
    });
    
    // Filtro de data personalizada
    const btnFiltrarData = document.getElementById('btnFiltrarData');
    btnFiltrarData.addEventListener('click', handleCustomDateFilter);
    
    // Navegação por abas
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });
}

// ============================================
// NAVEGAÇÃO POR ABAS
// ============================================

function switchTab(tabName) {
    // Remover classe active de todos os botões e conteúdos
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Adicionar classe active ao botão e conteúdo selecionados
    const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
    const activeContent = document.getElementById(`tab-${tabName}`);
    
    if (activeButton) activeButton.classList.add('active');
    if (activeContent) activeContent.classList.add('active');
    
    // Carregar dados quando abrir aba Gerenciar
    if (tabName === 'gerenciar') {
        console.log('🔧 Abrindo aba Gerenciar - carregando dados...');
        loadServicos();
        loadProdutos();
    }
}

// ============================================
// CÁLCULO AUTOMÁTICO DE VALORES
// ============================================

function setupServiceCalculation() {
    // Remover listeners antigos para evitar duplicação
    const allCheckboxes = document.querySelectorAll('input[type="checkbox"][data-price]');
    allCheckboxes.forEach(cb => {
        const newCb = cb.cloneNode(true);
        cb.parentNode.replaceChild(newCb, cb);
    });
    
    // Configurar cálculo para o formulário principal
    const checkboxes = document.querySelectorAll('#servicosGrid input[type="checkbox"][data-price], #consumoGrid input[type="checkbox"][data-price]');
    const valorTotalInput = document.getElementById('valorTotal');
    
    const calculateTotal = () => {
        let total = 0;
        const allChecked = document.querySelectorAll('#servicosGrid input[type="checkbox"][data-price]:checked, #consumoGrid input[type="checkbox"][data-price]:checked');
        allChecked.forEach(cb => {
            total += parseFloat(cb.dataset.price) || 0;
        });
        if (valorTotalInput) {
            valorTotalInput.value = total.toFixed(2);
        }
        console.log('💰 Total calculado:', total);
    };
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', calculateTotal);
    });
    
    // Configurar cálculo para o formulário de edição
    const editCheckboxes = document.querySelectorAll('#editServicosGrid input[type="checkbox"][data-price], #editConsumoGrid input[type="checkbox"][data-price]');
    const editValorTotalInput = document.getElementById('editValorTotal');
    
    const calculateEditTotal = () => {
        let total = 0;
        const allChecked = document.querySelectorAll('#editServicosGrid input[type="checkbox"][data-price]:checked, #editConsumoGrid input[type="checkbox"][data-price]:checked');
        allChecked.forEach(cb => {
            total += parseFloat(cb.dataset.price) || 0;
        });
        if (editValorTotalInput) {
            editValorTotalInput.value = total.toFixed(2);
        }
    };
    
    editCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', calculateEditTotal);
    });
    
    console.log('✅ Cálculo automático configurado:', checkboxes.length, 'checkboxes no formulário');
}

// ============================================
// MANIPULAÇÃO DO FORMULÁRIO
// ============================================

async function handleFormSubmit(e) {
    e.preventDefault();
    
    console.log('📝 Formulário submetido!');
    
    const clienteNome = document.getElementById('clienteNome').value || 'Cliente';
    const checkboxes = document.querySelectorAll('.service-item input[type="checkbox"]:checked');
    const valorTotal = parseFloat(document.getElementById('valorTotal').value);
    
    console.log('👤 Cliente:', clienteNome);
    console.log('✅ Serviços selecionados:', checkboxes.length);
    console.log('💰 Valor total:', valorTotal);
    
    // Validação
    if (checkboxes.length === 0) {
        console.warn('⚠️ Nenhum serviço ou produto selecionado');
        showToast('Selecione pelo menos um serviço ou produto!', 'error');
        return;
    }
    
    if (!valorTotal || valorTotal <= 0) {
        console.warn('⚠️ Valor inválido:', valorTotal);
        showToast('Valor inválido!', 'error');
        return;
    }
    
    // Coletar serviços e consumo selecionados
    const servicos = [];
    const consumo = [];
    
    checkboxes.forEach(cb => {
        const label = cb.nextElementSibling.querySelector('.service-name').textContent;
        const price = parseFloat(cb.dataset.price);
        const item = { nome: label, valor: price };
        
        // Verificar se é consumo ou serviço
        if (cb.value.startsWith('consumo-')) {
            consumo.push(item);
        } else {
            servicos.push(item);
        }
    });
    
    console.log('📋 Serviços:', servicos);
    console.log('🍺 Consumo:', consumo);
    
    // Criar objeto de atendimento
    const atendimento = {
        cliente: clienteNome,
        servicos: servicos,
        consumo: consumo,
        valorTotal: valorTotal,
        data: new Date(),
        timestamp: db ? firebase.firestore.FieldValue.serverTimestamp() : new Date().getTime()
    };
    
    console.log('💾 Salvando atendimento...', atendimento);
    
    try {
        // Salvar no Firebase
        if (db) {
            console.log('☁️ Salvando no Firebase...');
            await db.collection('atendimentos').add(atendimento);
            console.log('✅ Salvo no Firebase com sucesso!');
            showToast('Atendimento registrado com sucesso!', 'success');
        } else {
            // Fallback: salvar localmente se Firebase não estiver configurado
            console.log('💾 Salvando localmente...');
            saveLocalAtendimento(atendimento);
            console.log('✅ Salvo localmente com sucesso!');
            showToast('Atendimento salvo localmente!', 'success');
        }
        
        // Limpar formulário
        e.target.reset();
        document.getElementById('valorTotal').value = '';
        
        // Atualizar dashboard
        loadDashboardData();
        
        // Atualizar tabela
        loadAtendimentosTable();
        
        // Mudar para aba Início
        setTimeout(() => {
            switchTab('inicio');
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erro ao salvar atendimento:', error);
        showToast('Erro ao salvar atendimento!', 'error');
    }
}

// ============================================
// ARMAZENAMENTO LOCAL (FALLBACK)
// ============================================

function saveLocalAtendimento(atendimento) {
    let atendimentos = JSON.parse(localStorage.getItem('atendimentos') || '[]');
    atendimentos.push(atendimento);
    localStorage.setItem('atendimentos', JSON.stringify(atendimentos));
}

function getLocalAtendimentos() {
    return JSON.parse(localStorage.getItem('atendimentos') || '[]');
}

// ============================================
// CARREGAMENTO DE DADOS
// ============================================

async function loadDashboardData() {
    try {
        let atendimentos;
        
        if (db) {
            // Buscar do Firebase
            const dateRange = getDateRange();
            let query = db.collection('atendimentos');
            
            if (dateRange.start) {
                query = query.where('data', '>=', dateRange.start);
            }
            if (dateRange.end) {
                query = query.where('data', '<=', dateRange.end);
            }
            
            const snapshot = await query.orderBy('data', 'desc').get();
            atendimentos = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                data: doc.data().data?.toDate() || new Date(doc.data().data)
            }));
        } else {
            // Buscar do localStorage
            atendimentos = getLocalAtendimentos().map(a => ({
                ...a,
                data: new Date(a.data)
            }));
            atendimentos = filterAtendimentosByDate(atendimentos);
        }
        
        // Atualizar estatísticas
        updateStatistics(atendimentos);
        
        // Atualizar gráfico
        updateServicesChart(atendimentos);
        
        // Atualizar lista
        updateAtendimentosList(atendimentos);
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showToast('Erro ao carregar dados!', 'error');
    }
}

// ============================================
// FILTROS DE DATA
// ============================================

function getDateRange() {
    const now = new Date();
    let start, end;
    
    if (customDateRange) {
        return customDateRange;
    }
    
    switch (currentFilter) {
        case 'dia':
            start = new Date(now.setHours(0, 0, 0, 0));
            end = new Date(now.setHours(23, 59, 59, 999));
            break;
        case 'semana':
            const firstDay = now.getDate() - now.getDay();
            start = new Date(now.setDate(firstDay));
            start.setHours(0, 0, 0, 0);
            end = new Date(now.setDate(firstDay + 6));
            end.setHours(23, 59, 59, 999);
            break;
        case 'mes':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        case 'ano':
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
    }
    
    return { start, end };
}

function filterAtendimentosByDate(atendimentos) {
    const { start, end } = getDateRange();
    return atendimentos.filter(a => {
        const dataAtendimento = new Date(a.data);
        return dataAtendimento >= start && dataAtendimento <= end;
    });
}

function handleCustomDateFilter() {
    const dataInicio = document.getElementById('dataInicio').value;
    const dataFim = document.getElementById('dataFim').value;
    
    if (!dataInicio || !dataFim) {
        showToast('Selecione as datas de início e fim!', 'error');
        return;
    }
    
    const start = new Date(dataInicio);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(dataFim);
    end.setHours(23, 59, 59, 999);
    
    if (start > end) {
        showToast('Data de início deve ser anterior à data de fim!', 'error');
        return;
    }
    
    customDateRange = { start, end };
    
    // Desativar todos os botões de filtro
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    
    loadDashboardData();
}

// ============================================
// ATUALIZAÇÃO DE ESTATÍSTICAS
// ============================================

function updateStatistics(atendimentos) {
    const totalClientes = atendimentos.length;
    const totalFaturamento = atendimentos.reduce((sum, a) => sum + (a.valorTotal || 0), 0);
    const ticketMedio = totalClientes > 0 ? totalFaturamento / totalClientes : 0;
    
    document.getElementById('totalClientes').textContent = totalClientes;
    document.getElementById('totalFaturamento').textContent = formatCurrency(totalFaturamento);
    document.getElementById('ticketMedio').textContent = formatCurrency(ticketMedio);
}

// ============================================
// GRÁFICO DE SERVIÇOS
// ============================================

function updateServicesChart(atendimentos) {
    const chartContainer = document.getElementById('servicesChart');
    const noDataMessage = document.getElementById('noDataMessage');
    
    if (atendimentos.length === 0) {
        chartContainer.innerHTML = '';
        noDataMessage.style.display = 'block';
        return;
    }
    
    noDataMessage.style.display = 'none';
    
    // Contar serviços
    const servicosCount = {};
    const servicosValor = {};
    
    atendimentos.forEach(atendimento => {
        atendimento.servicos.forEach(servico => {
            const nome = servico.nome;
            servicosCount[nome] = (servicosCount[nome] || 0) + 1;
            servicosValor[nome] = (servicosValor[nome] || 0) + servico.valor;
        });
    });
    
    // Calcular total
    const totalValor = Object.values(servicosValor).reduce((sum, val) => sum + val, 0);
    
    // Criar barras
    chartContainer.innerHTML = '';
    
    // Ordenar por valor (maior para menor)
    const servicosOrdenados = Object.keys(servicosValor).sort((a, b) => servicosValor[b] - servicosValor[a]);
    
    servicosOrdenados.forEach(servico => {
        const valor = servicosValor[servico];
        const quantidade = servicosCount[servico];
        const percentual = ((valor / totalValor) * 100).toFixed(1);
        
        const barHtml = `
            <div class="chart-bar">
                <div class="chart-bar-header">
                    <span class="chart-bar-label">
                        ${servico}
                    </span>
                    <span class="chart-bar-value">${formatCurrency(valor)}</span>
                </div>
                <div class="chart-bar-progress">
                    <div class="chart-bar-fill" style="width: ${percentual}%"></div>
                </div>
                <div class="chart-bar-percentage">
                    ${percentual}% do total • ${quantidade} ${quantidade === 1 ? 'atendimento' : 'atendimentos'}
                </div>
            </div>
        `;
        
        chartContainer.innerHTML += barHtml;
    });
}

function getServiceIcon(serviceName) {
    return '';
}

// ============================================
// LISTA DE ATENDIMENTOS
// ============================================

function updateAtendimentosList(atendimentos) {
    const listaContainer = document.getElementById('atendimentosLista');
    
    if (atendimentos.length === 0) {
        listaContainer.innerHTML = '<p class="no-data-message">Nenhum atendimento para exibir</p>';
        return;
    }
    
    listaContainer.innerHTML = '';
    
    // Mostrar últimos 10 atendimentos
    const atendimentosRecentes = atendimentos.slice(0, 10);
    
    atendimentosRecentes.forEach(atendimento => {
        const servicosHtml = atendimento.servicos
            .map(s => `<span class="servico-tag">${s.nome}</span>`)
            .join('');
        
        const consumoHtml = atendimento.consumo && atendimento.consumo.length > 0
            ? atendimento.consumo.map(c => `<span class="servico-tag" style="background: #8b5cf6;">${c.nome}</span>`).join('')
            : '';
        
        const dataFormatada = formatDate(atendimento.data);
        
        const itemHtml = `
            <div class="atendimento-item">
                <div class="atendimento-header">
                    <span class="atendimento-cliente">${atendimento.cliente}</span>
                    <span class="atendimento-valor">${formatCurrency(atendimento.valorTotal)}</span>
                </div>
                <div class="atendimento-servicos">
                    ${servicosHtml}
                    ${consumoHtml}
                </div>
                <div class="atendimento-data">${dataFormatada}</div>
            </div>
        `;
        
        listaContainer.innerHTML += itemHtml;
    });
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(date) {
    const d = new Date(date);
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return d.toLocaleDateString('pt-BR', options);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// ATUALIZAÇÃO AUTOMÁTICA
// ============================================

// Atualizar dados a cada 30 segundos se houver Firebase
if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
    setInterval(() => {
        loadDashboardData();
        loadAtendimentosTable();
    }, 30000);
}

// ============================================
// TABELA DE ATENDIMENTOS
// ============================================

let allAtendimentos = [];

async function loadAtendimentosTable() {
    try {
        let atendimentos;
        
        if (db) {
            // Buscar do Firebase
            const snapshot = await db.collection('atendimentos')
                .orderBy('data', 'desc')
                .get();
            atendimentos = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                data: doc.data().data?.toDate() || new Date(doc.data().data)
            }));
        } else {
            // Buscar do localStorage
            atendimentos = getLocalAtendimentos().map((a, index) => ({
                id: `local_${index}`,
                ...a,
                data: new Date(a.data)
            }));
        }
        
        allAtendimentos = atendimentos;
        renderAtendimentosTable(atendimentos);
        updateTableInfo(atendimentos.length);
        
    } catch (error) {
        console.error('❌ Erro ao carregar tabela:', error);
    }
}

function renderAtendimentosTable(atendimentos) {
    const tbody = document.getElementById('atendimentosTableBody');
    
    if (atendimentos.length === 0) {
        tbody.innerHTML = `
            <tr class="no-data-row">
                <td colspan="5" class="no-data-message">Nenhum atendimento encontrado</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    atendimentos.forEach(atendimento => {
        const servicosHtml = atendimento.servicos
            .map(s => `<span class="table-servico-tag">${s.nome}</span>`)
            .join('');
        
        const consumoHtml = atendimento.consumo && atendimento.consumo.length > 0
            ? atendimento.consumo.map(c => `<span class="table-servico-tag" style="background: #8b5cf6;">${c.nome}</span>`).join('')
            : '';
        
        const dataFormatada = formatDateTime(atendimento.data);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="table-data">${dataFormatada}</td>
            <td class="table-cliente">${atendimento.cliente}</td>
            <td><div class="table-servicos">${servicosHtml}${consumoHtml}</div></td>
            <td class="table-valor">${formatCurrency(atendimento.valorTotal)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-action btn-edit" onclick="editAtendimento('${atendimento.id}')">Editar</button>
                    <button class="btn-action btn-delete" onclick="deleteAtendimento('${atendimento.id}')">Excluir</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateTableInfo(count) {
    const info = document.getElementById('totalAtendimentosTabela');
    info.textContent = `${count} ${count === 1 ? 'atendimento' : 'atendimentos'}`;
}

function formatDateTime(date) {
    const d = new Date(date);
    const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} ${timeStr}`;
}

// ============================================
// BUSCA NA TABELA
// ============================================

function setupTableSearch() {
    const searchInput = document.getElementById('searchAtendimentos');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = allAtendimentos.filter(a => 
            a.cliente.toLowerCase().includes(searchTerm)
        );
        renderAtendimentosTable(filtered);
        updateTableInfo(filtered.length);
    });
}

// ============================================
// EDITAR ATENDIMENTO
// ============================================

function editAtendimento(id) {
    const atendimento = allAtendimentos.find(a => a.id === id);
    if (!atendimento) {
        showToast('Atendimento não encontrado!', 'error');
        return;
    }
    
    // Preencher modal
    document.getElementById('editAtendimentoId').value = id;
    document.getElementById('editClienteNome').value = atendimento.cliente;
    document.getElementById('editValorTotal').value = atendimento.valorTotal.toFixed(2);
    
    // Desmarcar todos os checkboxes
    document.querySelectorAll('#editServicosGrid input[type="checkbox"], #editConsumoGrid input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    
    // Marcar serviços selecionados
    atendimento.servicos.forEach(servico => {
        const checkbox = Array.from(document.querySelectorAll('#editServicosGrid input[type="checkbox"]'))
            .find(cb => cb.nextElementSibling.querySelector('.service-name').textContent === servico.nome);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
    
    // Marcar consumo selecionado
    if (atendimento.consumo && atendimento.consumo.length > 0) {
        atendimento.consumo.forEach(item => {
            const checkbox = Array.from(document.querySelectorAll('#editConsumoGrid input[type="checkbox"]'))
                .find(cb => cb.nextElementSibling.querySelector('.service-name').textContent === item.nome);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }
    
    // Recalcular total
    const editCheckboxes = document.querySelectorAll('#editServicosGrid input[type="checkbox"]:checked, #editConsumoGrid input[type="checkbox"]:checked');
    let total = 0;
    editCheckboxes.forEach(cb => {
        total += parseFloat(cb.dataset.price) || 0;
    });
    document.getElementById('editValorTotal').value = total.toFixed(2);
    
    // Abrir modal
    document.getElementById('editModal').classList.add('show');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('show');
    document.getElementById('editAtendimentoForm').reset();
}

async function saveEditAtendimento() {
    const id = document.getElementById('editAtendimentoId').value;
    const clienteNome = document.getElementById('editClienteNome').value || 'Cliente';
    const checkboxes = document.querySelectorAll('#editModal .service-item input[type="checkbox"]:checked');
    const valorTotal = parseFloat(document.getElementById('editValorTotal').value);
    
    if (checkboxes.length === 0) {
        showToast('Selecione pelo menos um serviço!', 'error');
        return;
    }
    
    if (!valorTotal || valorTotal <= 0) {
        showToast('Valor inválido!', 'error');
        return;
    }
    
    const servicos = [];
    const consumo = [];
    
    checkboxes.forEach(cb => {
        const label = cb.nextElementSibling.querySelector('.service-name').textContent;
        const price = parseFloat(cb.dataset.price);
        const item = { nome: label, valor: price };
        
        // Verificar se é consumo ou serviço
        if (cb.value.startsWith('consumo-')) {
            consumo.push(item);
        } else {
            servicos.push(item);
        }
    });
    
    const updatedData = {
        cliente: clienteNome,
        servicos: servicos,
        consumo: consumo,
        valorTotal: valorTotal
    };
    
    try {
        if (db) {
            await db.collection('atendimentos').doc(id).update(updatedData);
            showToast('Atendimento atualizado com sucesso!', 'success');
        } else {
            // Atualizar localStorage
            const atendimentos = getLocalAtendimentos();
            const index = parseInt(id.replace('local_', ''));
            if (atendimentos[index]) {
                atendimentos[index] = { ...atendimentos[index], ...updatedData };
                localStorage.setItem('atendimentos', JSON.stringify(atendimentos));
                showToast('Atendimento atualizado localmente!', 'success');
            }
        }
        
        closeEditModal();
        loadAtendimentosTable();
        loadDashboardData();
        
    } catch (error) {
        console.error('❌ Erro ao atualizar:', error);
        showToast('Erro ao atualizar atendimento!', 'error');
    }
}

// ============================================
// EXCLUIR ATENDIMENTO
// ============================================

async function deleteAtendimento(id) {
    if (!confirm('Tem certeza que deseja excluir este atendimento?')) {
        return;
    }
    
    try {
        if (db) {
            await db.collection('atendimentos').doc(id).delete();
            showToast('Atendimento excluído com sucesso!', 'success');
        } else {
            // Excluir do localStorage
            const atendimentos = getLocalAtendimentos();
            const index = parseInt(id.replace('local_', ''));
            if (atendimentos[index]) {
                atendimentos.splice(index, 1);
                localStorage.setItem('atendimentos', JSON.stringify(atendimentos));
                showToast('Atendimento excluído localmente!', 'success');
            }
        }
        
        loadAtendimentosTable();
        loadDashboardData();
        
    } catch (error) {
        console.error('❌ Erro ao excluir:', error);
        showToast('Erro ao excluir atendimento!', 'error');
    }
}
// ============================================
// GERENCIAR SERVIÇOS E PRODUTOS
// ============================================

// Inicializar gerenciamento
function initializeGerenciar() {
    const servicoForm = document.getElementById('servicoForm');
    const produtoForm = document.getElementById('produtoForm');
    
    if (servicoForm) {
        servicoForm.addEventListener('submit', handleAddServico);
    }
    
    if (produtoForm) {
        produtoForm.addEventListener('submit', handleAddProduto);
    }
    
    // Inicializar serviços padrão
    initializeDefaultServices();
    
    loadServicos();
    loadProdutos();
}

// === SERVIÇOS ===

function getServicosFromStorage() {
    const servicos = localStorage.getItem('customServicos');
    return servicos ? JSON.parse(servicos) : [];
}

function saveServicosToStorage(servicos) {
    localStorage.setItem('customServicos', JSON.stringify(servicos));
}

// Inicializar serviços padrão se não existirem
function initializeDefaultServices() {
    const servicos = getServicosFromStorage();
    
    if (servicos.length === 0) {
        console.log('🔧 Populando serviços padrão...');
        
        const defaultServices = [
            { id: 'default-1', nome: 'Corte', valor: 35 },
            { id: 'default-2', nome: 'Corte Social', valor: 25 },
            { id: 'default-3', nome: 'Sobrancelha', valor: 5 },
            { id: 'default-4', nome: 'Bigode', valor: 5 },
            { id: 'default-5', nome: 'Cavanhaque', valor: 15 },
            { id: 'default-6', nome: 'Alinhamento', valor: 15 },
            { id: 'default-7', nome: 'Barba', valor: 30 },
            { id: 'default-8', nome: 'Pigmentação', valor: 15 },
            { id: 'default-9', nome: 'Luzes', valor: 120 },
            { id: 'default-10', nome: 'Platinado', valor: 150 },
            { id: 'default-11', nome: 'Platinado Cabelo Grande', valor: 230 }
        ];
        
        saveServicosToStorage(defaultServices);
        console.log('✅ Serviços padrão populados:', defaultServices.length);
        return defaultServices;
    }
    
    return servicos;
}

async function handleAddServico(e) {
    e.preventDefault();
    
    const nome = document.getElementById('servicoNome').value.trim();
    const valor = parseFloat(document.getElementById('servicoValor').value);
    
    if (!nome || valor <= 0) {
        showToast('Preencha todos os campos corretamente!', 'error');
        return;
    }
    
    const servico = {
        id: Date.now().toString(),
        nome: nome,
        valor: valor
    };
    
    const servicos = getServicosFromStorage();
    servicos.push(servico);
    saveServicosToStorage(servicos);
    
    showToast('Serviço adicionado com sucesso!', 'success');
    document.getElementById('servicoForm').reset();
    loadServicos();
    updateServicesGrid();
}

function loadServicos() {
    const servicos = getServicosFromStorage();
    const tbody = document.getElementById('servicosTableBody');
    
    if (!tbody) {
        console.warn('⚠️ Elemento servicosTableBody não encontrado');
        return;
    }
    
    console.log('📋 Carregando serviços:', servicos);
    
    if (servicos.length === 0) {
        tbody.innerHTML = '<tr class="no-data-row"><td colspan="3" class="no-data-message">Nenhum serviço cadastrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = servicos.map(servico => `
        <tr>
            <td class="table-cliente">${servico.nome}</td>
            <td class="table-valor">${formatCurrency(servico.valor)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" onclick="editServico('${servico.id}')" title="Editar serviço">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Editar
                    </button>
                    <button class="btn-delete" onclick="deleteServico('${servico.id}')" title="Excluir serviço">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                        Excluir
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function editServico(id) {
    const servicos = getServicosFromStorage();
    const servico = servicos.find(s => s.id === id);
    
    if (!servico) {
        showToast('Serviço não encontrado!', 'error');
        return;
    }
    
    const novoNome = prompt('Novo nome do serviço:', servico.nome);
    if (novoNome === null) return; // Cancelou
    
    const novoValorStr = prompt('Novo valor do serviço (R$):', servico.valor);
    if (novoValorStr === null) return; // Cancelou
    
    const novoValor = parseFloat(novoValorStr);
    
    if (!novoNome.trim() || isNaN(novoValor) || novoValor <= 0) {
        showToast('Valores inválidos!', 'error');
        return;
    }
    
    servico.nome = novoNome.trim();
    servico.valor = novoValor;
    
    saveServicosToStorage(servicos);
    showToast('Serviço atualizado com sucesso!', 'success');
    loadServicos();
    updateServicesGrid();
}

function deleteServico(id) {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    
    let servicos = getServicosFromStorage();
    servicos = servicos.filter(s => s.id !== id);
    saveServicosToStorage(servicos);
    
    showToast('Serviço excluído com sucesso!', 'success');
    loadServicos();
    updateServicesGrid();
}

// === PRODUTOS ===

function getProdutosFromStorage() {
    const produtos = localStorage.getItem('customProdutos');
    return produtos ? JSON.parse(produtos) : [];
}

function saveProdutosToStorage(produtos) {
    localStorage.setItem('customProdutos', JSON.stringify(produtos));
}

async function handleAddProduto(e) {
    e.preventDefault();
    
    const nome = document.getElementById('produtoNome').value.trim();
    const valor = parseFloat(document.getElementById('produtoValor').value);
    
    if (!nome || valor <= 0) {
        showToast('Preencha todos os campos corretamente!', 'error');
        return;
    }
    
    const produto = {
        id: Date.now().toString(),
        nome: nome,
        valor: valor
    };
    
    const produtos = getProdutosFromStorage();
    produtos.push(produto);
    saveProdutosToStorage(produtos);
    
    showToast('Produto adicionado com sucesso!', 'success');
    document.getElementById('produtoForm').reset();
    loadProdutos();
    updateConsumoGrid();
}

function loadProdutos() {
    const produtos = getProdutosFromStorage();
    const tbody = document.getElementById('produtosTableBody');
    
    if (!tbody) {
        console.warn('⚠️ Elemento produtosTableBody não encontrado');
        return;
    }
    
    console.log('🍺 Carregando produtos:', produtos);
    
    if (produtos.length === 0) {
        tbody.innerHTML = '<tr class="no-data-row"><td colspan="3" class="no-data-message">Nenhum produto cadastrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = produtos.map(produto => `
        <tr>
            <td class="table-cliente">${produto.nome}</td>
            <td class="table-valor">${formatCurrency(produto.valor)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" onclick="editProduto('${produto.id}')" title="Editar produto">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Editar
                    </button>
                    <button class="btn-delete" onclick="deleteProduto('${produto.id}')" title="Excluir produto">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                        Excluir
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function editProduto(id) {
    const produtos = getProdutosFromStorage();
    const produto = produtos.find(p => p.id === id);
    
    if (!produto) {
        showToast('Produto não encontrado!', 'error');
        return;
    }
    
    const novoNome = prompt('Novo nome do produto:', produto.nome);
    if (novoNome === null) return; // Cancelou
    
    const novoValorStr = prompt('Novo valor do produto (R$):', produto.valor);
    if (novoValorStr === null) return; // Cancelou
    
    const novoValor = parseFloat(novoValorStr);
    
    if (!novoNome.trim() || isNaN(novoValor) || novoValor <= 0) {
        showToast('Valores inválidos!', 'error');
        return;
    }
    
    produto.nome = novoNome.trim();
    produto.valor = novoValor;
    
    saveProdutosToStorage(produtos);
    showToast('Produto atualizado com sucesso!', 'success');
    loadProdutos();
    updateConsumoGrid();
}

function deleteProduto(id) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    let produtos = getProdutosFromStorage();
    produtos = produtos.filter(p => p.id !== id);
    saveProdutosToStorage(produtos);
    
    showToast('Produto excluído com sucesso!', 'success');
    loadProdutos();
    updateConsumoGrid();
}

// === ATUALIZAR GRIDS DE SERVIÇOS E CONSUMO ===

function updateServicesGrid() {
    // Garantir que serviços padrão existam
    const servicos = initializeDefaultServices();
    
    const servicoGrid = document.getElementById('servicosGrid');
    const editServicoGrid = document.getElementById('editServicosGrid');
    
    if (!servicoGrid) {
        console.warn('⚠️ Grid de serviços não encontrado');
        return;
    }
    
    console.log('🔄 Atualizando grid de serviços. Total:', servicos.length);
    
    // Criar HTML dos serviços
    const createServiceHTML = (servico, prefix = '') => `
        <div class="service-item">
            <input type="checkbox" id="${prefix}servico-${servico.id}" value="${servico.id}" data-price="${servico.valor}">
            <label for="${prefix}servico-${servico.id}">
                <span class="service-name">${servico.nome}</span>
                <span class="service-price">R$ ${servico.valor.toFixed(2)}</span>
            </label>
        </div>
    `;
    
    // Preencher grid do formulário principal
    if (servicos.length === 0) {
        servicoGrid.innerHTML = '<p class="no-data-message">Nenhum serviço cadastrado. Vá em Gerenciar para adicionar serviços.</p>';
    } else {
        servicoGrid.innerHTML = servicos.map(s => createServiceHTML(s)).join('');
    }
    
    // Preencher grid do modal de edição
    if (editServicoGrid) {
        if (servicos.length === 0) {
            editServicoGrid.innerHTML = '<p class="no-data-message">Nenhum serviço cadastrado.</p>';
        } else {
            editServicoGrid.innerHTML = servicos.map(s => createServiceHTML(s, 'edit-')).join('');
        }
    }
    
    // Reconfigurar cálculo automático
    setupServiceCalculation();
    
    console.log('✅ Grid de serviços atualizado');
}

function updateConsumoGrid() {
    const produtos = getProdutosFromStorage();
    const consumoGrid = document.getElementById('consumoGrid');
    const editConsumoGrid = document.getElementById('editConsumoGrid');
    
    console.log('🔄 Atualizando grid de consumo. Total:', produtos.length);
    
    const grids = [
        { element: consumoGrid, prefix: 'consumoGrid' },
        { element: editConsumoGrid, prefix: 'editConsumoGrid' }
    ];
    
    grids.forEach(({ element, prefix }) => {
        if (!element) return;
        
        if (produtos.length === 0) {
            element.innerHTML = '<p class="no-data-message">Nenhum produto cadastrado. Vá em Gerenciar para adicionar produtos.</p>';
            return;
        }
        
        element.innerHTML = produtos.map(produto => `
            <div class="service-item">
                <input type="checkbox" id="${prefix}-${produto.id}" value="consumo-${produto.id}" data-price="${produto.valor}">
                <label for="${prefix}-${produto.id}">
                    <span class="service-name">${produto.nome}</span>
                    <span class="service-price">R$ ${produto.valor.toFixed(2)}</span>
                </label>
            </div>
        `).join('');
    });
    
    // Reconfigurar cálculo automático
    setupServiceCalculation();
}