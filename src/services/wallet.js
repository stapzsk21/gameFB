import { ethers } from 'ethers';

// Определение типа устройства
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

// Проверка доступности MetaMask (десктоп и мобильный)
export const isMetaMaskAvailable = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  // На десктопе проверяем window.ethereum
  if (!isMobile() && typeof window.ethereum !== 'undefined') {
    return true;
  }

  // На мобильном устройстве проверяем, открыт ли сайт во встроенном браузере MetaMask
  // или есть ли window.ethereum (если открыто из приложения MetaMask)
  if (isMobile()) {
    // Проверяем, есть ли window.ethereum (если открыто из приложения MetaMask)
    if (typeof window.ethereum !== 'undefined') {
      return true;
    }
    
    // Проверяем user agent на наличие MetaMask
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/MetaMask/i.test(userAgent)) {
      return true;
    }
  }

  return false;
};

// Подключение к кошельку
export const connectWallet = async () => {
  // На мобильном устройстве, если window.ethereum недоступен, пробуем открыть через deep link
  if (isMobile() && typeof window.ethereum === 'undefined') {
    // Пробуем открыть MetaMask через deep link
    const dappUrl = window.location.href;
    const metamaskAppDeepLink = `https://metamask.app.link/dapp/${encodeURIComponent(dappUrl)}`;
    
    // Показываем инструкцию пользователю
    const shouldOpen = window.confirm(
      'MetaMask не обнаружен в браузере.\n\n' +
      'Для подключения кошелька:\n' +
      '1. Откройте этот сайт во встроенном браузере MetaMask\n' +
      '2. Или нажмите OK, чтобы открыть MetaMask\n\n' +
      'Нажмите OK, чтобы открыть MetaMask, или Отмена, чтобы остаться здесь.'
    );
    
    if (shouldOpen) {
      window.location.href = metamaskAppDeepLink;
      throw new Error('Открываю MetaMask... Пожалуйста, вернитесь на сайт после подключения.');
    } else {
      throw new Error(
        'MetaMask не обнаружен.\n\n' +
        'Для подключения кошелька на мобильном устройстве:\n' +
        '1. Откройте приложение MetaMask\n' +
        '2. Нажмите на меню (три полоски)\n' +
        '3. Выберите "Браузер"\n' +
        '4. Введите адрес этого сайта\n' +
        '5. Вернитесь сюда и попробуйте снова'
      );
    }
  }

  if (!isMetaMaskAvailable()) {
    throw new Error('MetaMask не установлен. Пожалуйста, установите MetaMask расширение.');
  }

  try {
    // Запрашиваем доступ к аккаунтам
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (accounts.length === 0) {
      throw new Error('Нет подключенных аккаунтов');
    }

    const address = accounts[0];
    return address;
  } catch (error) {
    if (error.code === 4001) {
      throw new Error('Пользователь отклонил запрос на подключение');
    }
    throw error;
  }
};

// Получить текущий адрес кошелька
export const getCurrentAddress = async () => {
  if (!isMetaMaskAvailable()) {
    return null;
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    return address;
  } catch (error) {
    return null;
  }
};

// Подписать сообщение
export const signMessage = async (message) => {
  if (!isMetaMaskAvailable()) {
    throw new Error('MetaMask не доступен');
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const signature = await signer.signMessage(message);
    return signature;
  } catch (error) {
    if (error.code === 4001) {
      throw new Error('Пользователь отклонил подпись');
    }
    throw error;
  }
};

// Проверка сети (Sepolia testnet или Linea)
export const checkNetwork = async () => {
  if (!isMetaMaskAvailable() || typeof window.ethereum === 'undefined') {
    return false;
  }

  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    // Sepolia testnet chainId: 0xaa36a7 (11155111)
    // Linea mainnet chainId: 0xe708 (59144)
    // Linea testnet chainId: 0xe704 (59140)
    const sepoliaChainId = '0xaa36a7';
    const lineaMainnetChainId = '0xe708';
    const lineaTestnetChainId = '0xe704';
    
    // Разрешаем Sepolia и Linea (mainnet и testnet)
    return chainId === sepoliaChainId || 
           chainId === lineaMainnetChainId || 
           chainId === lineaTestnetChainId;
  } catch (error) {
    return false;
  }
};

// Переключение на Sepolia testnet (или оставляем текущую сеть, если это Linea)
export const switchToSepolia = async () => {
  if (!isMetaMaskAvailable() || typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask не доступен');
  }

  try {
    // Сначала проверяем текущую сеть
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    const lineaMainnetChainId = '0xe708';
    const lineaTestnetChainId = '0xe704';
    
    // Если уже на Linea, не переключаем
    if (currentChainId === lineaMainnetChainId || currentChainId === lineaTestnetChainId) {
      return true;
    }

    // Пробуем переключиться на Sepolia
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xaa36a7' }], // Sepolia
    });
    return true;
  } catch (error) {
    if (error.code === 4902) {
      // Сеть не добавлена, добавляем
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0xaa36a7',
              chainName: 'Sepolia',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            },
          ],
        });
        return true;
      } catch (addError) {
        throw new Error('Не удалось добавить сеть Sepolia');
      }
    }
    throw error;
  }
};

