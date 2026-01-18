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
}

// ============================================
// CÁLCULO AUTOMÁTICO DE VALORES
// ============================================

function setupServiceCalculation() {
    const checkboxes = document.querySelectorAll('.service-item input[type="checkbox"]');
    const valorTotalInput = document.getElementById('valorTotal');
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            let total = 0;
            checkboxes.forEach(cb => {
                if (cb.checked) {
                    total += parseFloat(cb.dataset.price);
                }
            });
            valorTotalInput.value = total.toFixed(2);
        });
    });
    
    // Mesma lógica para o formulário de edição
    const editCheckboxes = document.querySelectorAll('#editModal .service-item input[type="checkbox"]');
    const editValorTotalInput = document.getElementById('editValorTotal');
    
    editCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            let total = 0;
            editCheckboxes.forEach(cb => {
                if (cb.checked) {
                    total += parseFloat(cb.dataset.price);
                }
            });
            editValorTotalInput.value = total.toFixed(2);
        });
    });
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
        console.warn('⚠️ Nenhum serviço selecionado');
        showToast('Selecione pelo menos um serviço!', 'error');
        return;
    }
    
    if (!valorTotal || valorTotal <= 0) {
        console.warn('⚠️ Valor inválido:', valorTotal);
        showToast('Valor inválido!', 'error');
        return;
    }
    
    // Coletar serviços selecionados
    const servicos = [];
    checkboxes.forEach(cb => {
        const label = cb.nextElementSibling.querySelector('.service-name').textContent;
        const price = parseFloat(cb.dataset.price);
        servicos.push({ nome: label, valor: price });
    });
    
    console.log('📋 Serviços:', servicos);
    
    // Criar objeto de atendimento
    const atendimento = {
        cliente: clienteNome,
        servicos: servicos,
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
        
        const dataFormatada = formatDate(atendimento.data);
        
        const itemHtml = `
            <div class="atendimento-item">
                <div class="atendimento-header">
                    <span class="atendimento-cliente">${atendimento.cliente}</span>
                    <span class="atendimento-valor">${formatCurrency(atendimento.valorTotal)}</span>
                </div>
                <div class="atendimento-servicos">
                    ${servicosHtml}
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
        
        const dataFormatada = formatDateTime(atendimento.data);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="table-data">${dataFormatada}</td>
            <td class="table-cliente">${atendimento.cliente}</td>
            <td><div class="table-servicos">${servicosHtml}</div></td>
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
    document.querySelectorAll('#editModal .service-item input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    
    // Marcar serviços selecionados
    atendimento.servicos.forEach(servico => {
        const servicoNome = servico.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const checkbox = document.querySelector(`#editModal input[value="${servicoNome}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
    
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
    checkboxes.forEach(cb => {
        const label = cb.nextElementSibling.querySelector('.service-name').textContent;
        const price = parseFloat(cb.dataset.price);
        servicos.push({ nome: label, valor: price });
    });
    
    const updatedData = {
        cliente: clienteNome,
        servicos: servicos,
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
