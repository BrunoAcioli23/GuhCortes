// ============================================
// CONFIGURAÇÃO E INICIALIZAÇÃO
// ============================================

// Variáveis já declaradas em session-manager.js: auth, db, storage, currentUser, currentBarbearia, currentBarbeariaId
// Apenas declarar novas variáveis específicas desta página
let currentFilter = 'dia';
let customDateRange = null;

// Inicializar app quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
});

async function initializeApp() {
    console.log('🚀 Inicializando aplicativo...');
    
    // Verificar se Firebase está configurado
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        if (!db) db = firebase.firestore();
        console.log('✅ Firebase conectado com sucesso!');
        console.log('📊 Firestore pronto para uso');
        
        // Inicializar autenticação e carregar dados da barbearia
        try {
            await initializeAuth();
            console.log('✅ Autenticação inicializada');
            console.log('🏪 Barbearia:', currentBarbearia?.nome);
        } catch (error) {
            console.error('❌ Erro na autenticação:', error);
            return; // Não continuar se não estiver autenticado
        }
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
        populateServicesFilter();
    }, 100);
    
    console.log('✅ Aplicativo inicializado com sucesso!');
}

// ============================================
// DATA E HORA
// ============================================

function updateCurrentDate() {
    // Não usado mais no header, mas mantido para compatibilidade
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Modal Novo Atendimento
    const btnNovoAtendimento = document.getElementById('btnNovoAtendimento');
    const modalAtendimento = document.getElementById('modalAtendimento');
    const closeModalAtendimento = document.getElementById('closeModalAtendimento');
    const btnCancelarAtendimento = document.getElementById('btnCancelarAtendimento');
    
    btnNovoAtendimento.addEventListener('click', () => {
        modalAtendimento.classList.add('active');
        initializeModalAtendimento();
    });
    
    closeModalAtendimento.addEventListener('click', () => {
        modalAtendimento.classList.remove('active');
        resetAtendimentoForm();
    });
    
    btnCancelarAtendimento.addEventListener('click', () => {
        modalAtendimento.classList.remove('active');
        resetAtendimentoForm();
    });
    
    // Fechar modal ao clicar fora
    modalAtendimento.addEventListener('click', (e) => {
        if (e.target === modalAtendimento) {
            modalAtendimento.classList.remove('active');
            resetAtendimentoForm();
        }
    });
    
    // Autocomplete de clientes
    setupClienteAutocomplete();
    
    // Busca de serviços
    setupServicosSearch();
    
    // Contador de caracteres da observação
    setupObservacaoCounter();
    
    // Atualização do resumo em tempo real
    setupResumoAtendimento();
    
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
            
            // Atualizar campos de data específica com base no filtro selecionado
            updateDateInputsFromFilter(btn.dataset.filter);
            
            loadDashboardData();
        });
    });
    
    // Filtro de data personalizada
    const btnFiltrarData = document.getElementById('btnFiltrarData');
    btnFiltrarData.addEventListener('click', handleCustomDateFilter);
    
    // Inicializar campos de data com o dia atual
    const hoje = new Date();
    const dataHoje = hoje.toISOString().split('T')[0];
    document.getElementById('dataInicio').value = dataHoje;
    document.getElementById('dataFim').value = dataHoje;
    
    // Filtros da tabela
    const btnAplicarFiltros = document.getElementById('btnAplicarFiltros');
    const btnLimparFiltros = document.getElementById('btnLimparFiltros');
    
    btnAplicarFiltros.addEventListener('click', aplicarFiltrosTabela);
    btnLimparFiltros.addEventListener('click', limparFiltrosTabela);
    
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
    
    // Mostrar loader no botão
    const btnSubmit = document.getElementById('btnSubmitAtendimento');
    const btnText = btnSubmit.querySelector('.btn-text');
    const btnLoader = btnSubmit.querySelector('.btn-loader');
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
    btnSubmit.disabled = true;
    
    const clienteNome = document.getElementById('clienteNome').value.trim();
    const checkboxes = document.querySelectorAll('#servicosSelection input[type="checkbox"]:checked');
    const valorTotal = parseFloat(document.getElementById('valorTotal').value);
    const observacao = document.getElementById('observacao').value.trim();
    const dataAtendimento = document.getElementById('atendimentoData').value;
    const horaAtendimento = document.getElementById('atendimentoHora').value;
    
    console.log('👤 Cliente:', clienteNome);
    console.log('✅ Serviços selecionados:', checkboxes.length);
    console.log('💰 Valor total:', valorTotal);
    console.log('📅 Data:', dataAtendimento);
    console.log('🕐 Hora:', horaAtendimento);
    
    // Validação
    if (!clienteNome) {
        showToast('Informe o nome do cliente!', 'error');
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        btnSubmit.disabled = false;
        return;
    }
    
    if (checkboxes.length === 0) {
        console.warn('⚠️ Nenhum serviço selecionado');
        showToast('Selecione pelo menos um serviço!', 'error');
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        btnSubmit.disabled = false;
        return;
    }
    
    if (!valorTotal || valorTotal <= 0) {
        console.warn('⚠️ Valor inválido:', valorTotal);
        showToast('Valor inválido!', 'error');
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        btnSubmit.disabled = false;
        return;
    }
    
    // Coletar serviços selecionados
    const servicos = [];
    
    checkboxes.forEach(cb => {
        const nome = cb.dataset.nome;
        const valor = parseFloat(cb.dataset.valor);
        servicos.push({ nome, valor });
    });
    
    console.log('📋 Serviços:', servicos);
    
    // Criar data/hora do atendimento
    const dataHoraAtendimento = new Date(`${dataAtendimento}T${horaAtendimento}`);
    
    // Criar objeto de atendimento
    const atendimento = {
        barbeariaId: currentBarbeariaId,
        cliente: clienteNome,
        servicos: servicos,
        consumo: [], // Removido campo de consumo por enquanto
        valorTotal: valorTotal,
        observacao: observacao || '',
        data: db ? firebase.firestore.Timestamp.fromDate(dataHoraAtendimento) : dataAtendimento,
        dataString: dataAtendimento, // Manter string para exibição
        hora: horaAtendimento,
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
        
        // Resetar botão
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        btnSubmit.disabled = false;
        
        // Fechar modal e resetar formulário
        document.getElementById('modalAtendimento').classList.remove('active');
        resetAtendimentoForm();
        
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
        
        // Resetar botão em caso de erro
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        btnSubmit.disabled = false;
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
            
            console.log('📅 Filtro de data:', currentFilter);
            console.log('📅 Range:', dateRange);
            
            let query = db.collection('atendimentos')
                .where('barbeariaId', '==', currentBarbeariaId); // Filtrar por barbearia
            
            // Converter datas para Timestamp para comparação correta (somente se houver datas definidas)
            if (dateRange && dateRange.start && dateRange.end) {
                const startTimestamp = firebase.firestore.Timestamp.fromDate(new Date(dateRange.start));
                const endTimestamp = firebase.firestore.Timestamp.fromDate(new Date(dateRange.end));
                console.log('📅 Aplicando filtro de datas:', startTimestamp.toDate(), 'até', endTimestamp.toDate());
                query = query.where('data', '>=', startTimestamp).where('data', '<=', endTimestamp);
            }
            
            const snapshot = await query.orderBy('data', 'desc').get();
            
            console.log('📊 Atendimentos encontrados:', snapshot.size);
            
            atendimentos = snapshot.docs.map(doc => {
                const docData = doc.data();
                let dataAtendimento;
                
                // Verificar o tipo de data e converter adequadamente
                if (docData.data && typeof docData.data.toDate === 'function') {
                    // É um Timestamp do Firestore
                    dataAtendimento = docData.data.toDate();
                } else if (docData.data) {
                    // É uma string ou número, converter para Date
                    dataAtendimento = new Date(docData.data);
                } else {
                    // Fallback para data atual
                    dataAtendimento = new Date();
                }
                
                return {
                    id: doc.id,
                    ...docData,
                    data: dataAtendimento
                };
            });
        } else {
            // Buscar do localStorage
            atendimentos = getLocalAtendimentos().map(a => ({
                ...a,
                data: new Date(a.data)
            }));
            atendimentos = filterAtendimentosByDate(atendimentos);
        }
        
        console.log('✅ Total de atendimentos carregados:', atendimentos.length);
        if (atendimentos.length > 0) {
            console.log('📋 Primeiros 3 atendimentos:', atendimentos.slice(0, 3));
        }
        
        // Atualizar estatísticas
        updateStatistics(atendimentos);
        
        // Atualizar gráfico
        updateServicesChart(atendimentos);
        
        // Atualizar lista
        updateAtendimentosList(atendimentos);
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        console.error('Detalhes do erro:', error.message);
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

// Atualizar campos de data com base no filtro selecionado
function updateDateInputsFromFilter(filter) {
    const dataInicio = document.getElementById('dataInicio');
    const dataFim = document.getElementById('dataFim');
    
    const hoje = new Date();
    let start, end;
    
    switch(filter) {
        case 'dia':
            start = new Date(hoje);
            end = new Date(hoje);
            break;
        case 'semana':
            start = new Date(hoje);
            start.setDate(hoje.getDate() - hoje.getDay());
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            break;
        case 'mes':
            start = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            end = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
            break;
        case 'ano':
            start = new Date(hoje.getFullYear(), 0, 1);
            end = new Date(hoje.getFullYear(), 11, 31);
            break;
        default:
            return;
    }
    
    // Formatar datas para input type="date" (YYYY-MM-DD)
    dataInicio.value = start.toISOString().split('T')[0];
    dataFim.value = end.toISOString().split('T')[0];
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
    
    // Contar serviços e consumo juntos
    const itensCount = {};
    const itensValor = {};
    const itensTipo = {}; // Para saber se é serviço ou consumo
    const itensRegistros = {}; // Armazenar registros de cada item
    
    atendimentos.forEach(atendimento => {
        // Serviços
        atendimento.servicos.forEach(servico => {
            const nome = servico.nome;
            itensCount[nome] = (itensCount[nome] || 0) + 1;
            itensValor[nome] = (itensValor[nome] || 0) + servico.valor;
            itensTipo[nome] = 'servico';
            
            if (!itensRegistros[nome]) itensRegistros[nome] = [];
            itensRegistros[nome].push({
                cliente: atendimento.cliente,
                servico: nome,
                data: atendimento.data,
                hora: atendimento.hora,
                valor: servico.valor
            });
        });
        
        // Consumo
        if (atendimento.consumo && atendimento.consumo.length > 0) {
            atendimento.consumo.forEach(produto => {
                const nome = produto.nome;
                itensCount[nome] = (itensCount[nome] || 0) + 1;
                itensValor[nome] = (itensValor[nome] || 0) + produto.valor;
                itensTipo[nome] = 'consumo';
                
                if (!itensRegistros[nome]) itensRegistros[nome] = [];
                itensRegistros[nome].push({
                    cliente: atendimento.cliente,
                    servico: nome,
                    data: atendimento.data,
                    hora: atendimento.hora,
                    valor: produto.valor
                });
            });
        }
    });
    
    // Calcular total
    const totalValor = Object.values(itensValor).reduce((sum, val) => sum + val, 0);
    
    if (totalValor === 0) {
        chartContainer.innerHTML = '';
        noDataMessage.style.display = 'block';
        return;
    }
    
    // Criar barras
    chartContainer.innerHTML = '';
    
    // Ordenar por valor (maior para menor)
    const itensOrdenados = Object.keys(itensValor).sort((a, b) => itensValor[b] - itensValor[a]);
    
    itensOrdenados.forEach((item, index) => {
        const valor = itensValor[item];
        const quantidade = itensCount[item];
        const percentual = ((valor / totalValor) * 100).toFixed(1);
        const tipo = itensTipo[item];
        const cor = tipo === 'consumo' ? '#8b5cf6' : 'var(--color-silver)';
        const icone = tipo === 'consumo' ? '🍺' : '✂️';
        const registros = itensRegistros[item];
        
        const barElement = document.createElement('div');
        barElement.className = 'chart-bar-wrapper';
        barElement.innerHTML = `
            <div class="chart-bar clickable" data-item-index="${index}">
                <div class="chart-bar-header">
                    <span class="chart-bar-label">
                        ${icone} ${item}
                    </span>
                    <span class="chart-bar-value">${formatCurrency(valor)}</span>
                </div>
                <div class="chart-bar-progress">
                    <div class="chart-bar-fill" style="width: ${percentual}%; background: ${cor};"></div>
                </div>
                <div class="chart-bar-percentage">
                    ${percentual}% do total • ${quantidade} ${quantidade === 1 ? 'vez' : 'vezes'}
                    <span class="expand-icon">▼</span>
                </div>
            </div>
            <div class="chart-details" id="details-${index}" style="display: none;">
                ${registros.map(reg => `
                    <div class="detail-item">
                        <span class="detail-cliente">${reg.cliente}</span>
                        <span class="detail-separator">-</span>
                        <span class="detail-servico">${reg.servico}</span>
                        <span class="detail-separator">-</span>
                        <span class="detail-valor">${formatCurrency(reg.valor)}</span>
                        <span class="detail-separator">-</span>
                        <span class="detail-data">${formatDate(reg.data)}${reg.hora ? ` às ${reg.hora}` : ''}</span>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Adicionar evento de clique
        const chartBar = barElement.querySelector('.chart-bar');
        const detailsDiv = barElement.querySelector('.chart-details');
        const expandIcon = barElement.querySelector('.expand-icon');
        
        chartBar.addEventListener('click', () => {
            const isExpanded = detailsDiv.style.display === 'block';
            detailsDiv.style.display = isExpanded ? 'none' : 'block';
            expandIcon.textContent = isExpanded ? '▼' : '▲';
            chartBar.classList.toggle('expanded', !isExpanded);
        });
        
        chartContainer.appendChild(barElement);
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
    
    // Mostrar últimos 5 atendimentos
    const atendimentosRecentes = atendimentos.slice(0, 5);
    
    atendimentosRecentes.forEach(atendimento => {
        const servicosNomes = atendimento.servicos.map(s => s.nome).join(', ');
        const consumoNomes = atendimento.consumo && atendimento.consumo.length > 0
            ? atendimento.consumo.map(c => c.nome).join(', ')
            : '';
        
        const todosServicos = consumoNomes ? `${servicosNomes}, ${consumoNomes}` : servicosNomes;
        const dataFormatada = formatDate(atendimento.data);
        const horaFormatada = atendimento.hora || '';
        
        const itemHtml = `
            <div class="detail-item">
                <span class="detail-cliente">${atendimento.cliente}</span>
                <span class="detail-separator">-</span>
                <span class="detail-servico">${todosServicos}</span>
                <span class="detail-separator">-</span>
                <span class="detail-valor">${formatCurrency(atendimento.valorTotal)}</span>
                <span class="detail-separator">-</span>
                <span class="detail-data">${dataFormatada}${horaFormatada ? ` às ${horaFormatada}` : ''}</span>
            </div>
        `;
        
        listaContainer.innerHTML += itemHtml;
    });
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function resetAtendimentoForm() {
    document.getElementById('atendimentoForm').reset();
    
    // Limpar campos
    document.getElementById('clienteNome').value = '';
    document.getElementById('valorTotal').value = '';
    document.getElementById('observacao').value = '';
    document.getElementById('searchServicos').value = '';
    
    // Resetar contador de observação
    const obsCount = document.getElementById('obsCount');
    if (obsCount) obsCount.textContent = '0';
    
    // Fechar autocomplete
    const dropdown = document.getElementById('clienteAutocomplete');
    if (dropdown) dropdown.classList.remove('show');
    
    // Desmarcar todos os checkboxes
    document.querySelectorAll('.service-checkbox-item').forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.checked = false;
        }
        item.classList.remove('selected');
        item.style.display = 'flex'; // Mostrar todos novamente
    });
    
    // Resetar resumo
    updateResumoAtendimento();
}

function loadServicesForModal() {
    const container = document.getElementById('servicosSelection');
    
    if (!currentBarbearia) {
        container.innerHTML = '<p class="no-data-message">Nenhum serviço disponível</p>';
        return;
    }
    
    const servicos = currentBarbearia.servicos || [];
    
    if (servicos.length === 0) {
        container.innerHTML = '<p class="no-data-message">Nenhum serviço cadastrado. Vá em Gerenciar para adicionar serviços.</p>';
        return;
    }
    
    container.innerHTML = '';
    
    servicos.forEach((servico, index) => {
        const item = document.createElement('div');
        item.className = 'service-checkbox-item';
        item.innerHTML = `
            <label class="service-checkbox-label">
                <input type="checkbox" value="${index}" data-nome="${servico.nome}" data-valor="${servico.valor}">
                <span class="service-checkbox-name">${servico.nome}</span>
            </label>
            <span class="service-checkbox-value">${formatCurrency(servico.valor)}</span>
        `;
        
        const checkbox = item.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
            calculateTotalValue();
            updateResumoAtendimento(); // Atualizar resumo
        });
        
        container.appendChild(item);
    });
}

function calculateTotalValue() {
    const checkboxes = document.querySelectorAll('#servicosSelection input[type="checkbox"]:checked');
    let total = 0;
    
    checkboxes.forEach(cb => {
        total += parseFloat(cb.dataset.valor) || 0;
    });
    
    const valorTotalInput = document.getElementById('valorTotal');
    if (valorTotalInput) {
        valorTotalInput.value = total.toFixed(2);
        // Atualizar resumo após calcular
        updateResumoAtendimento();
    }
}

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
                .where('barbeariaId', '==', currentBarbeariaId) // Filtrar por barbearia
                .orderBy('data', 'desc')
                .get();
            atendimentos = snapshot.docs.map(doc => {
                const docData = doc.data();
                let dataAtendimento;
                
                // Verificar o tipo de data e converter adequadamente
                if (docData.data && typeof docData.data.toDate === 'function') {
                    // É um Timestamp do Firestore
                    dataAtendimento = docData.data.toDate();
                } else if (docData.data) {
                    // É uma string ou número, converter para Date
                    dataAtendimento = new Date(docData.data);
                } else {
                    // Fallback para data atual
                    dataAtendimento = new Date();
                }
                
                return {
                    id: doc.id,
                    ...docData,
                    data: dataAtendimento
                };
            });
        } else {
            // Buscar do localStorage
            atendimentos = getLocalAtendimentos().map((a, index) => ({
                id: `local_${index}`,
                ...a,
                data: new Date(a.data)
            }));
        }
        
        allAtendimentos = atendimentos;
        // Não renderizar automaticamente - aguardar filtros
        showFilterPrompt();
        updateTableInfo(atendimentos.length);
        
    } catch (error) {
        console.error('❌ Erro ao carregar tabela:', error);
        console.error('Detalhes do erro:', error.message);
    }
}

function showFilterPrompt() {
    const tbody = document.getElementById('atendimentosTableBody');
    tbody.innerHTML = `
        <tr class="no-data-row">
            <td colspan="5" class="no-data-message">Use os filtros acima e clique em "Aplicar Filtros" para visualizar os atendimentos</td>
        </tr>
    `;
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
    // Removida busca antiga - agora usa sistema de filtros
}

function aplicarFiltrosTabela() {
    const filterCliente = document.getElementById('filterCliente').value.toLowerCase().trim();
    const filterServico = document.getElementById('filterServico').value;
    const filterDia = document.getElementById('filterDia').value;
    const filterMes = document.getElementById('filterMes').value;
    const filterAno = document.getElementById('filterAno').value;
    const filterHora = document.getElementById('filterHora').value;
    
    let filtered = [...allAtendimentos];
    
    // Filtro por cliente
    if (filterCliente) {
        filtered = filtered.filter(a => 
            a.cliente.toLowerCase().includes(filterCliente)
        );
    }
    
    // Filtro por serviço
    if (filterServico) {
        filtered = filtered.filter(a => 
            a.servicos.some(s => s.nome === filterServico)
        );
    }
    
    // Filtro por dia
    if (filterDia) {
        filtered = filtered.filter(a => {
            const data = new Date(a.data);
            return data.getDate() === parseInt(filterDia);
        });
    }
    
    // Filtro por mês
    if (filterMes) {
        filtered = filtered.filter(a => {
            const data = new Date(a.data);
            const mes = String(data.getMonth() + 1).padStart(2, '0');
            return mes === filterMes;
        });
    }
    
    // Filtro por ano
    if (filterAno) {
        filtered = filtered.filter(a => {
            const data = new Date(a.data);
            return data.getFullYear() === parseInt(filterAno);
        });
    }
    
    // Filtro por hora
    if (filterHora) {
        filtered = filtered.filter(a => {
            if (!a.hora) return false;
            return a.hora.startsWith(filterHora.substring(0, 2));
        });
    }
    
    renderAtendimentosTable(filtered);
    updateTableInfo(filtered.length);
}

function limparFiltrosTabela() {
    document.getElementById('filterCliente').value = '';
    document.getElementById('filterServico').value = '';
    document.getElementById('filterDia').value = '';
    document.getElementById('filterMes').value = '';
    document.getElementById('filterAno').value = '';
    document.getElementById('filterHora').value = '';
    
    renderAtendimentosTable(allAtendimentos);
    updateTableInfo(allAtendimentos.length);
}

function populateServicesFilter() {
    const select = document.getElementById('filterServico');
    
    if (!currentBarbearia || !currentBarbearia.servicos) {
        return;
    }
    
    // Limpar opções existentes (exceto a primeira)
    select.innerHTML = '<option value="">Todos os serviços</option>';
    
    // Adicionar serviços
    currentBarbearia.servicos.forEach(servico => {
        const option = document.createElement('option');
        option.value = servico.nome;
        option.textContent = servico.nome;
        select.appendChild(option);
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
    const clienteForm = document.getElementById('clienteForm');
    
    if (servicoForm) {
        servicoForm.addEventListener('submit', handleAddServico);
    }
    
    if (produtoForm) {
        produtoForm.addEventListener('submit', handleAddProduto);
    }
    
    if (clienteForm) {
        clienteForm.addEventListener('submit', handleAddCliente);
    }
    
    loadServicos();
    loadProdutos();
    loadClientes();
}

// === SERVIÇOS ===

// Serviços agora são carregados diretamente do Firestore via currentBarbearia.servicos
function getServicosFromFirestore() {
    if (!currentBarbearia || !currentBarbearia.servicos) {
        console.warn('⚠️ Barbearia não carregada ou sem serviços');
        return [];
    }
    return currentBarbearia.servicos;
}

async function handleAddServico(e) {
    e.preventDefault();
    
    const nome = document.getElementById('servicoNome').value.trim();
    const valor = parseFloat(document.getElementById('servicoValor').value);
    
    if (!nome || valor <= 0) {
        showToast('Preencha todos os campos corretamente!', 'error');
        return;
    }
    
    if (!currentBarbearia || !currentBarbearia.id) {
        showToast('Erro: Barbearia não identificada!', 'error');
        return;
    }
    
    const servico = {
        id: `servico-${Date.now()}`,
        nome: nome,
        valor: valor,
        dataCriacao: new Date().toISOString()
    };
    
    try {
        const servicos = currentBarbearia.servicos || [];
        servicos.push(servico);
        
        await db.collection('barbearias').doc(currentBarbearia.id).update({
            servicos: servicos,
            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        currentBarbearia.servicos = servicos;
        
        showToast('Serviço adicionado com sucesso!', 'success');
        document.getElementById('servicoForm').reset();
        loadServicos();
        updateServicesGrid();
        loadServicesForModal();
    } catch (error) {
        console.error('Erro ao adicionar serviço:', error);
        showToast('Erro ao adicionar serviço!', 'error');
    }
}

function loadServicos() {
    const servicos = getServicosFromFirestore();
    const container = document.getElementById('servicosTableBody');
    const countBadge = document.getElementById('servicosCount');
    
    if (!container) {
        console.warn('⚠️ Elemento servicosTableBody não encontrado');
        return;
    }
    
    console.log('📋 Carregando serviços do Firestore:', servicos);
    
    // Atualizar badge de contagem
    if (countBadge) {
        countBadge.textContent = `${servicos.length} serviço${servicos.length !== 1 ? 's' : ''}`;
    }
    
    if (servicos.length === 0) {
        container.innerHTML = `
            <div class="no-data-card">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M20 7h-9M14 17H5M18 12h-2M9 3v18"/>
                </svg>
                <p>Nenhum serviço cadastrado</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = servicos.map(servico => `
        <div class="service-card" data-id="${servico.id}">
            <div class="service-card-header">
                <div class="service-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 7h-9M14 17H5M18 12h-2M9 3v18"/>
                    </svg>
                </div>
                <div class="service-info">
                    <h3 class="service-name">${servico.nome}</h3>
                    <span class="service-type">Serviço</span>
                </div>
            </div>
            <div class="service-card-body">
                <div class="service-price">
                    <span class="price-label">Valor</span>
                    <span class="price-value">${formatCurrency(servico.valor)}</span>
                </div>
            </div>
            <div class="service-card-actions">
                <button class="btn-card-action btn-edit" onclick="editServico('${servico.id}')" title="Editar serviço">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Editar
                </button>
                <button class="btn-card-action btn-delete" onclick="deleteServico('${servico.id}')" title="Excluir serviço">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    Excluir
                </button>
            </div>
        </div>
    `).join('');
}

async function editServico(id) {
    if (!currentBarbearia || !currentBarbearia.id) {
        showToast('Erro: Barbearia não identificada!', 'error');
        return;
    }
    
    const servicos = currentBarbearia.servicos || [];
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
    
    try {
        await db.collection('barbearias').doc(currentBarbearia.id).update({
            servicos: servicos,
            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Serviço atualizado com sucesso!', 'success');
        loadServicos();
        updateServicesGrid();
        loadServicesForModal();
    } catch (error) {
        console.error('Erro ao atualizar serviço:', error);
        showToast('Erro ao atualizar serviço!', 'error');
    }
}

async function deleteServico(id) {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    
    if (!currentBarbearia || !currentBarbearia.id) {
        showToast('Erro: Barbearia não identificada!', 'error');
        return;
    }
    
    try {
        const servicos = currentBarbearia.servicos || [];
        const filtered = servicos.filter(s => s.id !== id);
        
        await db.collection('barbearias').doc(currentBarbearia.id).update({
            servicos: filtered,
            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        currentBarbearia.servicos = filtered;
        
        showToast('Serviço excluído com sucesso!', 'success');
        loadServicos();
        updateServicesGrid();
        loadServicesForModal();
    } catch (error) {
        console.error('Erro ao excluir serviço:', error);
        showToast('Erro ao excluir serviço!', 'error');
    }
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
    const container = document.getElementById('produtosTableBody');
    const countBadge = document.getElementById('produtosCount');
    
    if (!container) {
        console.warn('⚠️ Elemento produtosTableBody não encontrado');
        return;
    }
    
    console.log('🍺 Carregando produtos:', produtos);
    
    // Atualizar badge de contagem
    if (countBadge) {
        countBadge.textContent = `${produtos.length} produto${produtos.length !== 1 ? 's' : ''}`;
    }
    
    if (produtos.length === 0) {
        container.innerHTML = `
            <div class="no-data-card">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                <p>Nenhum produto cadastrado</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = produtos.map(produto => `
        <div class="service-card" data-id="${produto.id}">
            <div class="service-card-header">
                <div class="service-icon product-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                </div>
                <div class="service-info">
                    <h3 class="service-name">${produto.nome}</h3>
                    <span class="service-type">Produto</span>
                </div>
            </div>
            <div class="service-card-body">
                <div class="service-price">
                    <span class="price-label">Valor</span>
                    <span class="price-value">${formatCurrency(produto.valor)}</span>
                </div>
            </div>
            <div class="service-card-actions">
                <button class="btn-card-action btn-edit" onclick="editProduto('${produto.id}')" title="Editar produto">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Editar
                </button>
                <button class="btn-card-action btn-delete" onclick="deleteProduto('${produto.id}')" title="Excluir produto">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    Excluir
                </button>
            </div>
        </div>
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
    const servicos = getServicosFromFirestore();
    
    const servicoGrid = document.getElementById('servicosGrid');
    const editServicoGrid = document.getElementById('editServicosGrid');
    
    if (!servicoGrid) {
        console.warn('⚠️ Grid de serviços não encontrado');
        return;
    }
    
    console.log('🔄 Atualizando grid de serviços do Firestore. Total:', servicos.length);
    
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
            element.innerHTML = '<p class="no-data-message">Nenhum produto cadastrado. Vá em Cadastro para adicionar produtos.</p>';
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

// ============================================
// GERENCIAMENTO DE CLIENTES
// ============================================

// === CLIENTES ===

function getClientesFromFirestore() {
    if (!currentBarbearia || !currentBarbearia.clientes) {
        return [];
    }
    return currentBarbearia.clientes;
}

function saveClientesToFirestore(clientes) {
    if (!db || !currentBarbeariaId) {
        console.warn('⚠️ Firebase não disponível para salvar clientes');
        return;
    }

    db.collection('barbearias').doc(currentBarbeariaId).update({
        clientes: clientes
    }).then(() => {
        console.log('✅ Clientes salvos no Firestore');
        currentBarbearia.clientes = clientes;
    }).catch(error => {
        console.error('❌ Erro ao salvar clientes:', error);
    });
}

async function handleAddCliente(e) {
    e.preventDefault();
    
    const nome = document.getElementById('clienteCadastroNome').value.trim();
    const telefone = document.getElementById('clienteTelefone').value.trim();
    
    if (!nome) {
        showToast('Preencha o nome do cliente!', 'error');
        return;
    }
    
    const novoCliente = {
        id: Date.now().toString(),
        nome: nome,
        telefone: telefone || ''
    };
    
    const clientes = getClientesFromFirestore();
    clientes.push(novoCliente);
    
    saveClientesToFirestore(clientes);
    showToast('Cliente adicionado com sucesso!', 'success');
    
    e.target.reset();
    loadClientes();
}

function loadClientes() {
    const tbody = document.getElementById('clientesTableBody');
    const clientes = getClientesFromFirestore();
    
    if (clientes.length === 0) {
        tbody.innerHTML = '<tr class="no-data-row"><td colspan="3" class="no-data-message">Nenhum cliente cadastrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = clientes.map(cliente => `
        <tr>
            <td class="table-cliente">${cliente.nome}</td>
            <td>${cliente.telefone || '-'}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-action btn-delete" onclick="deleteCliente('${cliente.id}')">Excluir</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ============================================
// MELHORIAS DO MODAL DE ATENDIMENTO
// ============================================

// Inicializar modal de atendimento
function initializeModalAtendimento() {
    loadServicesForModal();
    
    // Definir data e hora atual
    const agora = new Date();
    document.getElementById('atendimentoData').value = agora.toISOString().split('T')[0];
    document.getElementById('atendimentoHora').value = agora.toTimeString().substring(0, 5);
    
    // Limpar busca
    document.getElementById('searchServicos').value = '';
    
    // Resetar resumo
    updateResumoAtendimento();
}

// Autocomplete de clientes
function setupClienteAutocomplete() {
    const input = document.getElementById('clienteNome');
    const dropdown = document.getElementById('clienteAutocomplete');
    
    if (!input || !dropdown) return;
    
    let clientes = [];
    
    input.addEventListener('input', () => {
        const query = input.value.trim().toLowerCase();
        
        if (query.length < 2) {
            dropdown.classList.remove('show');
            return;
        }
        
        // Buscar clientes únicos dos atendimentos
        if (db) {
            db.collection('atendimentos')
                .where('barbeariaId', '==', currentBarbeariaId)
                .get()
                .then(snapshot => {
                    const clientesSet = new Set();
                    snapshot.forEach(doc => {
                        const cliente = doc.data().cliente;
                        if (cliente && cliente.toLowerCase().includes(query)) {
                            clientesSet.add(cliente);
                        }
                    });
                    clientes = Array.from(clientesSet);
                    renderAutocomplete(clientes, query);
                });
        } else {
            // Fallback: buscar no localStorage
            const atendimentos = JSON.parse(localStorage.getItem('atendimentos') || '[]');
            const clientesSet = new Set();
            atendimentos.forEach(atend => {
                if (atend.cliente && atend.cliente.toLowerCase().includes(query)) {
                    clientesSet.add(atend.cliente);
                }
            });
            clientes = Array.from(clientesSet);
            renderAutocomplete(clientes, query);
        }
    });
    
    function renderAutocomplete(items, query) {
        if (items.length === 0) {
            dropdown.classList.remove('show');
            return;
        }
        
        dropdown.innerHTML = items.slice(0, 5).map(item => `
            <div class="autocomplete-item" data-value="${item}">
                ${item}
            </div>
        `).join('');
        
        dropdown.classList.add('show');
        
        // Adicionar eventos de clique
        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                input.value = item.dataset.value;
                dropdown.classList.remove('show');
            });
        });
    }
    
    // Fechar dropdown ao clicar fora
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
}

// Busca de serviços
function setupServicosSearch() {
    const searchInput = document.getElementById('searchServicos');
    
    if (!searchInput) return;
    
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        const checkboxes = document.querySelectorAll('#servicosSelection .service-checkbox');
        
        checkboxes.forEach(checkbox => {
            const label = checkbox.querySelector('label');
            const text = label ? label.textContent.toLowerCase() : '';
            
            if (text.includes(query)) {
                checkbox.style.display = 'flex';
            } else {
                checkbox.style.display = 'none';
            }
        });
    });
}

// Contador de observação
function setupObservacaoCounter() {
    const textarea = document.getElementById('observacao');
    const counter = document.getElementById('obsCount');
    
    if (!textarea || !counter) return;
    
    textarea.addEventListener('input', () => {
        const length = textarea.value.length;
        counter.textContent = length;
        
        if (length > 200) {
            textarea.value = textarea.value.substring(0, 200);
            counter.textContent = '200';
        }
    });
}

// Resumo do atendimento em tempo real
function setupResumoAtendimento() {
    // Observar mudanças nos checkboxes de serviços
    const observer = new MutationObserver(() => {
        updateResumoAtendimento();
    });
    
    const servicosSelection = document.getElementById('servicosSelection');
    if (servicosSelection) {
        observer.observe(servicosSelection, {
            childList: true,
            subtree: true
        });
    }
    
    // Observar mudanças no valor total
    const valorTotal = document.getElementById('valorTotal');
    if (valorTotal) {
        valorTotal.addEventListener('input', updateResumoAtendimento);
    }
}

// Atualizar resumo
function updateResumoAtendimento() {
    const checkboxes = document.querySelectorAll('#servicosSelection input[type="checkbox"]:checked');
    const valorTotal = parseFloat(document.getElementById('valorTotal')?.value || 0);
    
    const resumoServicos = document.getElementById('resumoServicos');
    const resumoTotal = document.getElementById('resumoTotal');
    const servicosCount = document.getElementById('servicosCount');
    
    if (!resumoServicos || !resumoTotal || !servicosCount) return;
    
    // Atualizar contador
    servicosCount.textContent = checkboxes.length;
    
    // Atualizar serviços no resumo
    if (checkboxes.length === 0) {
        resumoServicos.textContent = 'Nenhum selecionado';
    } else if (checkboxes.length === 1) {
        resumoServicos.textContent = checkboxes[0].dataset.nome;
    } else {
        resumoServicos.textContent = `${checkboxes.length} serviços`;
    }
    
    // Atualizar total
    resumoTotal.textContent = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;
    
    // Atualizar status do valor
    const valorStatus = document.getElementById('valorStatus');
    if (valorStatus) {
        if (valorTotal > 0) {
            valorStatus.textContent = '✓';
            valorStatus.style.color = 'var(--color-success)';
        } else {
            valorStatus.textContent = '!';
            valorStatus.style.color = 'var(--color-error)';
        }
    }
}

function deleteCliente(clienteId) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) {
        return;
    }
    
    const clientes = getClientesFromFirestore();
    const filtered = clientes.filter(c => c.id !== clienteId);
    
    saveClientesToFirestore(filtered);
    showToast('Cliente excluído com sucesso!', 'success');
    loadClientes();
}