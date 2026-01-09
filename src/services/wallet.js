import { ethers } from 'ethers';

// Проверка доступности MetaMask
export const isMetaMaskAvailable = () => {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
};

// Подключение к кошельку
export const connectWallet = async () => {
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

// Проверка сети (Sepolia testnet)
export const checkNetwork = async () => {
  if (!isMetaMaskAvailable()) {
    return false;
  }

  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    // Sepolia testnet chainId: 0xaa36a7 (11155111)
    const sepoliaChainId = '0xaa36a7';
    return chainId === sepoliaChainId;
  } catch (error) {
    return false;
  }
};

// Переключение на Sepolia testnet
export const switchToSepolia = async () => {
  if (!isMetaMaskAvailable()) {
    throw new Error('MetaMask не доступен');
  }

  try {
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

