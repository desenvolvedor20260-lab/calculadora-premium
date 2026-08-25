/* ===============================================
   CALCULADORA PREMIUM - JAVASCRIPT FRONTEND
   =============================================== */

// CONFIGURAÇÕES
const API_URL = 'http://localhost:3000/api';
const PAYMENT_CHECK_INTERVAL = 3000; // 3 segundos
const PAYMENT_TIMEOUT = 600000; // 10 minutos

// ESTADO DA APLICAÇÃO
const state = {
    sessionId: null,
    calculatedValue: null,
    paymentId: null,
    paymentCheckInterval: null,
    isProcessing: false
};

// ===============================================
// INICIALIZAÇÃO
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeSession();
    attachEventListeners();
});

function initializeSession() {
    // Gera uma sessão única para o usuário
    state.sessionId = generateSessionId();
    console.log('Session ID:', state.sessionId);
}

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ===============================================
// EVENT LISTENERS
// ===============================================

function attachEventListeners() {
    // Calculadora
    document.getElementById('calculate-btn').addEventListener('click', handleCalculate);
    document.getElementById('value').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleCalculate();
    });
    document.getElementById('percentage').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleCalculate();
    });

    // Resultado bloqueado
    document.getElementById('unlock-btn').addEventListener('click', handleUnlock);
    document.getElementById('back-btn').addEventListener('click', handleBackToCalculator);

    // Pagamento
    document.getElementById('copy-btn').addEventListener('click', handleCopyPix);
    document.getElementById('verify-payment-btn').addEventListener('click', handleVerifyPayment);
    document.getElementById('cancel-payment-btn').addEventListener('click', handleCancelPayment);

    // Resultado liberado
    document.getElementById('new-calc-btn').addEventListener('click', handleNewCalculation);
}

// ===============================================
// CALCULADORA
// ===============================================

async function handleCalculate() {
    // Validação
    const valueInput = document.getElementById('value');
    const percentageInput = document.getElementById('percentage');
    const valueError = document.getElementById('value-error');
    const percentageError = document.getElementById('percentage-error');
    const calcError = document.getElementById('calc-error');

    // Limpar erros anteriores
    valueError.textContent = '';
    percentageError.textContent = '';
    calcError.textContent = '';

    // Validar campos
    const value = parseFloat(valueInput.value);
    const percentage = parseFloat(percentageInput.value);

    let hasError = false;

    if (!valueInput.value || isNaN(value) || value <= 0) {
        valueError.textContent = 'Digite um valor válido e maior que 0';
        hasError = true;
    }

    if (!percentageInput.value || isNaN(percentage) || percentage < 0 || percentage > 100) {
        percentageError.textContent = 'Digite um percentual válido entre 0 e 100';
        hasError = true;
    }

    if (hasError) return;

    // Mostrar loading
    showCalculatorLoading(true);

    try {
        // Enviar cálculo para o backend
        const response = await fetch(`${API_URL}/calculate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: state.sessionId,
                value: value,
                percentage: percentage
            })
        });

        if (!response.ok) {
            throw new Error('Erro ao calcular');
        }

        const data = await response.json();

        // Armazenar resultado
        state.calculatedValue = data.result;

        // Mostrar resultado bloqueado
        showCalculatorLoading(false);
        showLockedResult();

    } catch (error) {
        console.error('Erro:', error);
        calcError.textContent = 'Erro ao processar o cálculo. Tente novamente.';
        showCalculatorLoading(false);
    }
}

function showCalculatorLoading(show) {
    const btn = document.getElementById('calculate-btn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');

    if (show) {
        btn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-flex';
    } else {
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

// ===============================================
// RESULTADO BLOQUEADO
// ===============================================

function showLockedResult() {
    document.getElementById('calculator-section').style.display = 'none';
    document.getElementById('locked-result-section').style.display = 'block';
    document.getElementById('payment-section').style.display = 'none';
    document.getElementById('unlocked-result-section').style.display = 'none';

    // Mostrar resultado bloqueado
    document.getElementById('result-value').textContent = '••••••••';
}

function handleBackToCalculator() {
    document.getElementById('calculator-section').style.display = 'block';
    document.getElementById('locked-result-section').style.display = 'none';
    document.getElementById('payment-section').style.display = 'none';
    document.getElementById('unlocked-result-section').style.display = 'none';

    // Parar verificação de pagamento se estiver rodando
    if (state.paymentCheckInterval) {
        clearInterval(state.paymentCheckInterval);
        state.paymentCheckInterval = null;
    }

    // Limpar formulário
    document.getElementById('value').value = '';
    document.getElementById('percentage').value = '';
}

// ===============================================
// PAGAMENTO
// ===============================================

async function handleUnlock() {
    if (state.isProcessing) return;

    state.isProcessing = true;
    document.getElementById('unlock-btn').disabled = true;

    try {
        // Criar pagamento no backend
        const response = await fetch(`${API_URL}/payment/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: state.sessionId,
                amount: 2490, // R$ 24,90 em centavos
                result: state.calculatedValue
            })
        });

        if (!response.ok) {
            throw new Error('Erro ao criar pagamento');
        }

        const data = await response.json();
        state.paymentId = data.paymentId;

        // Mostrar tela de pagamento
        showPaymentModal(data);

        // Iniciar verificação automática de pagamento
        startPaymentVerification();

    } catch (error) {
        console.error('Erro:', error);
        showPaymentError('Erro ao criar pagamento. Tente novamente.');
    } finally {
        state.isProcessing = false;
        document.getElementById('unlock-btn').disabled = false;
    }
}

function showPaymentModal(paymentData) {
    document.getElementById('calculator-section').style.display = 'none';
    document.getElementById('locked-result-section').style.display = 'none';
    document.getElementById('payment-section').style.display = 'block';
    document.getElementById('unlocked-result-section').style.display = 'none';

    // Mostrar QR Code
    if (paymentData.qrCode) {
        const qrcodeContainer = document.getElementById('qrcode-container');
        const qrcodeDiv = document.getElementById('qrcode');
        qrcodeDiv.innerHTML = '';
        qrcodeDiv.appendChild(createQRCodeElement(paymentData.qrCode));
        qrcodeContainer.style.display = 'block';
    }

    // Mostrar Pix Copia e Cola
    if (paymentData.pixCopiaECola) {
        const pixInput = document.getElementById('pix-copy');
        pixInput.value = paymentData.pixCopiaECola;
        document.getElementById('pix-copy-container').style.display = 'block';
    }

    // Esconder loading
    document.getElementById('payment-loading').style.display = 'none';
}

function createQRCodeElement(qrCodeData) {
    const img = document.createElement('img');
    img.src = qrCodeData;
    img.alt = 'QR Code PIX';
    return img;
}

function handleCopyPix() {
    const pixInput = document.getElementById('pix-copy');
    const copyBtn = document.getElementById('copy-btn');

    // Copiar para clipboard
    pixInput.select();
    document.execCommand('copy');

    // Feedback visual
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✅ COPIADO!';
    copyBtn.classList.add('copied');

    setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('copied');
    }, 2000);
}

// ===============================================
// VERIFICAÇÃO DE PAGAMENTO
// ===============================================

function startPaymentVerification() {
    // Parar verificação anterior se existir
    if (state.paymentCheckInterval) {
        clearInterval(state.paymentCheckInterval);
    }

    // Verificar imediatamente
    checkPaymentStatus();

    // Verificar periodicamente
    state.paymentCheckInterval = setInterval(() => {
        checkPaymentStatus();
    }, PAYMENT_CHECK_INTERVAL);

    // Timeout após 10 minutos
    setTimeout(() => {
        if (state.paymentCheckInterval) {
            clearInterval(state.paymentCheckInterval);
            state.paymentCheckInterval = null;
            showPaymentError('Tempo limite de pagamento excedido. Tente novamente.');
        }
    }, PAYMENT_TIMEOUT);
}

async function checkPaymentStatus() {
    try {
        const response = await fetch(`${API_URL}/payment/status/${state.paymentId}`);

        if (!response.ok) {
            console.error('Erro ao verificar pagamento');
            return;
        }

        const data = await response.json();

        if (data.status === 'paid') {
            // Pagamento confirmado!
            clearInterval(state.paymentCheckInterval);
            state.paymentCheckInterval = null;
            showPaymentConfirmed();

            // Buscar resultado liberado
            setTimeout(() => {
                showUnlockedResult();
            }, 1500);
        }

    } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
    }
}

async function handleVerifyPayment() {
    const btn = document.getElementById('verify-payment-btn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Verificando...';

    await checkPaymentStatus();

    btn.disabled = false;
    btn.textContent = originalText;
}

function showPaymentConfirmed() {
    const paymentStatus = document.getElementById('payment-status');
    const statusIcon = paymentStatus.querySelector('.status-icon');
    const statusText = document.getElementById('status-text');

    paymentStatus.classList.add('success');
    statusIcon.textContent = '✅';
    statusText.textContent = 'Pagamento confirmado!';
}

function handleCancelPayment() {
    // Parar verificação
    if (state.paymentCheckInterval) {
        clearInterval(state.paymentCheckInterval);
        state.paymentCheckInterval = null;
    }

    // Voltar para resultado bloqueado
    showLockedResult();
}

function showPaymentError(message) {
    const errorDiv = document.getElementById('payment-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// ===============================================
// RESULTADO LIBERADO
// ===============================================

async function showUnlockedResult() {
    try {
        // Buscar resultado do backend
        const response = await fetch(`${API_URL}/result/${state.sessionId}`);

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Acesso negado. Pagamento não confirmado.');
            }
            throw new Error('Erro ao buscar resultado');
        }

        const data = await response.json();

        // Exibir resultado
        document.getElementById('calculator-section').style.display = 'none';
        document.getElementById('locked-result-section').style.display = 'none';
        document.getElementById('payment-section').style.display = 'none';
        document.getElementById('unlocked-result-section').style.display = 'block';

        // Mostrar resultado
        const resultElement = document.getElementById('final-result');
        resultElement.textContent = formatNumber(data.result);

        // Scroll para o resultado
        document.querySelector('.unlocked-card').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Erro:', error);
        showPaymentError('Erro ao carregar resultado. Por favor, recarregue a página.');
    }
}

function formatNumber(value) {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function handleNewCalculation() {
    // Reset estado
    state.calculatedValue = null;
    state.paymentId = null;
    state.sessionId = generateSessionId();

    // Voltar para calculadora
    document.getElementById('calculator-section').style.display = 'block';
    document.getElementById('locked-result-section').style.display = 'none';
    document.getElementById('payment-section').style.display = 'none';
    document.getElementById('unlocked-result-section').style.display = 'none';

    // Limpar formulário
    document.getElementById('value').value = '';
    document.getElementById('percentage').value = '';
    document.getElementById('calc-error').style.display = 'none';
    document.getElementById('payment-error').style.display = 'none';

    // Reset payment status
    document.getElementById('payment-status').classList.remove('success');
    document.getElementById('status-text').textContent = 'Aguardando pagamento...';
    document.getElementById('payment-status').querySelector('.status-icon').textContent = '⏳';

    // Scroll para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===============================================
// UTILITÁRIOS
// ===============================================

// Mostrar/ocultar loading no pagamento
function showPaymentLoading(show) {
    const loading = document.getElementById('payment-loading');
    loading.style.display = show ? 'block' : 'none';
}

// Log auxiliar
function log(message, data = null) {
    console.log(`[CALCULADORA]: ${message}`, data || '');
}
