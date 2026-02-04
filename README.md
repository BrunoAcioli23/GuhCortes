# 🏪 BarberShop Manager - Sistema Multi-Barbearia

Sistema completo de gerenciamento para barbearias com suporte a múltiplas empresas e planos de assinatura.

**Versão:** 2.0.0 | **Status:** ✅ Pronto para Produção | **Data:** 03/02/2026

---

## 📑 Índice

- [Visão Geral](#-visão-geral)
- [Início Rápido](#-início-rápido-5-minutos)
- [Instalação Detalhada](#-instalação-detalhada)
- [Planos e Funcionalidades](#-planos-e-funcionalidades)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Como Usar](#-como-usar)
- [Estrutura do Firebase](#-estrutura-do-firebase)
- [Solução de Problemas](#-solução-de-problemas)
- [Roadmap](#-roadmap)

---

## 🎯 Visão Geral

Sistema moderno de gerenciamento para barbearias com:

- 🔐 **Multi-Barbearia**: Cada barbearia com dados totalmente isolados
- 💎 **Planos de Assinatura**: Inicial (R$ 34,90) e Platinum (R$ 69,90)
- 📊 **Dashboard Completo**: Estatísticas, gráficos e relatórios
- 📝 **Gestão de Atendimentos**: Registro rápido e completo
- ⚙️ **Personalização**: Logo, serviços e produtos personalizados
- 🔒 **Segurança**: Autenticação robusta e dados protegidos

---

## ⚡ Início Rápido (5 minutos)

### 1️⃣ Configure o Firebase (2 minutos)

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto
3. Ative: **Authentication** (Email/Password), **Firestore Database** e **Storage**
4. Copie as credenciais para `firebase-config.js`
5. Aplique as regras de `firestore.rules` e `storage.rules`

### 2️⃣ Execute o Projeto (1 minuto)

```bash
# Opção A: VS Code Live Server (Recomendado)
- Instale a extensão "Live Server"
- Clique direito em login.html → "Open with Live Server"

# Opção B: Python
python -m http.server 8000

# Opção C: Node.js
npx http-server -p 8000
```

### 3️⃣ Use o Sistema (2 minutos)

1. Acesse `login.html` no navegador
2. Cadastre sua barbearia
3. Escolha seu plano (Inicial ou Platinum)
4. Configure logo e informações
5. Comece a usar! 🎉

---

## 🛠️ Instalação Detalhada

### Pré-requisitos

- Conta Google/Gmail
- Navegador moderno (Chrome, Firefox, Edge, Safari)
- Editor de código (VS Code recomendado)

### Passo 1: Configurar Firebase

#### 1.1 Criar Projeto Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Nome: `barbershop-manager`
4. Desative o Google Analytics (opcional)
5. Clique em "Criar projeto"

#### 1.2 Ativar Authentication

1. Menu lateral → **Authentication**
2. Clique em "Vamos começar"
3. Selecione **"Email/Password"**
4. Ative e salve

#### 1.3 Criar Firestore Database

1. Menu lateral → **Firestore Database**
2. Clique em "Criar banco de dados"
3. Modo: **"Produção"**
4. Localização: `southamerica-east1` (São Paulo)
5. Ativar

#### 1.4 Ativar Storage

1. Menu lateral → **Storage**
2. Clique em "Vamos começar"
3. Aceite as regras padrão
4. Mesma localização do Firestore
5. Concluído

#### 1.5 Obter Credenciais

1. ⚙️ Configurações → Configurações do projeto
2. "Seus aplicativos" → ícone `</>` (Web)
3. Apelido: `barbershop-web`
4. Registrar app
5. **Copie o código firebaseConfig**
6. Cole em `firebase-config.js`

**Exemplo:**
```javascript
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

#### 1.6 Configurar Regras de Segurança

**Firestore Rules:**
1. Firestore Database → **Regras**
2. Copie o conteúdo de `firestore.rules`
3. Cole e publique

**Storage Rules:**
1. Storage → **Regras**
2. Copie o conteúdo de `storage.rules`
3. Cole e publique

---

## 💎 Planos e Funcionalidades

### 📦 Pacote Inicial - R$ 34,90/mês

- ✅ Dashboard completo com estatísticas
- ✅ Gráficos de serviços
- ✅ Filtros de período
- ✅ Registro de atendimentos
- ✅ Gestão de serviços
- ✅ Gestão de produtos
- ✅ Configuração personalizada
- ✅ Upload de logo

### ⭐ Platinum - R$ 69,90/mês

- ✅ Tudo do Pacote Inicial
- 🔜 Sistema de Agendamento (em breve)
- 🔜 Notificações automáticas (em breve)
- 🔜 Relatórios avançados (em breve)

> **Nota:** Troque de plano a qualquer momento pelo menu 👤

---

## 📁 Estrutura do Projeto

```
GuhCortes/
├── 📄 login.html                  # Tela de login/cadastro
├── 📄 select-plan.html            # Seleção de plano
├── 📄 config.html                 # Configuração da barbearia
├── 📄 index.html                  # Dashboard principal
│
├── 📄 auth.js                     # Autenticação
├── 📄 plan-selection.js           # Lógica de planos
├── 📄 config.js                   # Configuração
├── 📄 app.js                      # Lógica principal
├── 📄 session-manager.js          # Sessão e permissões
├── 📄 firebase-data-manager.js    # Operações Firebase
├── 📄 firebase-config.js          # ⚠️ Credenciais
│
├── 📄 styles.css                  # Estilos principais
├── 📄 auth-styles.css             # Estilos autenticação
│
├── 📄 firestore.rules             # Regras Firestore
├── 📄 storage.rules               # Regras Storage
└── 📄 README.md                   # Este arquivo
```

### Fluxo de Navegação

```
login.html → select-plan.html → config.html → index.html
    ↓              ↓                 ↓              ↓
 Cadastro    Escolher Plano    Configurar    Dashboard
```

---

## 🎮 Como Usar

### Dashboard Principal

#### Aba: Início
- Estatísticas (clientes, faturamento, ticket médio)
- Filtros (hoje, semana, mês, ano, personalizado)
- Gráfico de serviços
- Atendimentos recentes

#### Aba: Atendimentos
- Registre novos atendimentos
- Selecione serviços (cálculo automático)
- Adicione produtos/consumo
- Valor calculado automaticamente

#### Aba: Gerenciar
- Adicionar/editar/excluir serviços
- Adicionar/editar/excluir produtos
- Personalizar preços

### Menu de Usuário (👤)

```
1. Configurações da Barbearia
2. Alterar Plano
3. Sair
```

---

## 🗄️ Estrutura do Firebase

### Firestore Collections

```
📦 barbearias/
   └── {userId}/
       ├── nome, proprietario, email
       ├── plano, modulosAtivos
       ├── logoUrl, endereco, telefone
       │
       ├── 📁 servicos/
       │   └── {servicoId}/
       │       ├── nome: string
       │       └── valor: number
       │
       └── 📁 produtos/
           └── {produtoId}/
               ├── nome: string
               └── valor: number

📦 atendimentos/
   └── {atendimentoId}/
       ├── barbeariaId: string  # Filtro
       ├── cliente: string
       ├── servicos: array
       ├── consumo: array
       ├── valorTotal: number
       └── data: timestamp
```

### Firebase Storage

```
📦 logos/
   └── {userId}_{timestamp}.jpg
```

---

## 🆘 Solução de Problemas

### ❌ "Firebase não configurado"

**Solução:**
1. Verifique `firebase-config.js`
2. Salve o arquivo
3. Recarregue (F5)
4. Console (F12) para ver erros

### ❌ "Permission denied"

**Solução:**
1. Firebase Console → Firestore → Regras
2. Copie `firestore.rules`
3. Publique
4. Aguarde alguns segundos

### ❌ "CORS error"

**Solução:**
- Use servidor local (Live Server, Python, Node)
- **NÃO** abra HTML diretamente

### ❌ Logo não carrega

**Solução:**
1. Verifique se Storage está ativo
2. Aplique `storage.rules`
3. Máximo: 2MB
4. Formatos: JPG, PNG

### 🐛 Debug Geral

1. Abra Console (F12)
2. Veja aba Console para erros
3. Aba Network para requisições
4. Limpe cache (Ctrl+Shift+Del)

---

## 🚀 Roadmap

### ✅ Implementado (100%)

- [x] Multi-barbearia
- [x] Autenticação
- [x] Planos de assinatura
- [x] Dashboard completo
- [x] Atendimentos
- [x] Serviços e produtos
- [x] Segurança

### 🔜 Próximas Fases

#### Fase 2: Agendamento (Platinum)
- [ ] Calendário interativo
- [ ] Horários disponíveis
- [ ] Confirmações
- [ ] Notificações email/SMS
- **Estimativa:** 2-3 semanas

#### Fase 3: App Mobile
- [ ] React Native/Flutter
- [ ] Para clientes agendarem
- [ ] Histórico
- [ ] Notificações push
- **Estimativa:** 4-6 semanas

#### Fase 4: Analytics Avançado
- [ ] Gráficos expandidos
- [ ] Exportação (PDF/Excel)
- [ ] Relatórios detalhados
- **Estimativa:** 2 semanas

#### Fase 5: Pagamentos
- [ ] Stripe/Mercado Pago
- [ ] Cobrança recorrente
- [ ] Faturas
- **Estimativa:** 3-4 semanas

---

## 💡 Dicas

### Design
- Logo quadrado 500x500px
- JPG ou PNG, máximo 2MB

### Uso
- Registre atendimentos regularmente
- Use filtros para análises
- Personalize serviços e preços

### Segurança
- Senha forte (8+ caracteres)
- Não compartilhe credenciais
- Logout em PCs públicos

### Backup
- Dados salvos automaticamente
- Acesse de qualquer dispositivo

---

## 📊 Status do Projeto

| Categoria | Status |
|-----------|--------|
| Autenticação | ✅ 100% |
| Planos | ✅ 100% |
| Multi-Barbearia | ✅ 100% |
| Dashboard | ✅ 100% |
| Atendimentos | ✅ 100% |
| Serviços/Produtos | ✅ 100% |
| Segurança | ✅ 100% |
| Agendamento | 🔜 0% |
| App Mobile | 🔜 0% |

---

## ✅ Checklist de Instalação

- [ ] Projeto Firebase criado
- [ ] Authentication ativado
- [ ] Firestore criado
- [ ] Storage ativado
- [ ] Credenciais em `firebase-config.js`
- [ ] Regras Firestore aplicadas
- [ ] Regras Storage aplicadas
- [ ] Servidor local rodando
- [ ] Conta criada
- [ ] Plano selecionado
- [ ] Barbearia configurada
- [ ] Dashboard funcionando

---

## 📞 Suporte

Para problemas:
1. Console do navegador (F12)
2. Firebase Console
3. Seção "Solução de Problemas" acima

---

## 🎓 Tecnologias

**Frontend:** HTML5, CSS3, JavaScript ES6+  
**Backend:** Firebase Auth, Firestore, Storage  
**Arquitetura:** Multi-tenancy, Modular, Escalável

---

## 🎉 Comece Agora!

1. Configure o Firebase
2. Execute o projeto
3. Cadastre sua barbearia
4. Use o sistema!

---

**Desenvolvido com ❤️ para modernizar a gestão de barbearias**

**Sistema completo, seguro e pronto para produção!** 🚀

---

*Versão 2.0.0 Multi-Barbearia - Última atualização: 03/02/2026*
