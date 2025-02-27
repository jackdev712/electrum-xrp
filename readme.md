# Electrum XRP

![Release](https://img.shields.io/github/v/release/jackdev712/electrum-xrp?style=for-the-badge&logo=github)
![License](https://img.shields.io/github/license/jackdev712/electrum-xrp?style=for-the-badge&logo=github)

**Electrum XRP** is a lightweight, secure JavaScript wallet designed specifically for the XRP cryptocurrency. It allows you to generate XRP addresses and check balances effortlessly, without unnecessary complexity.

---

## Features ✨

- **Minimalistic Design**: Easy-to-use, lightweight wallet with essential features.
- **Secure**: Your keys and transactions are kept private and secure.
- **Fast**: Instant balance check and wallet address generation.
- **Open Source**: Community-driven and open for contributions.

---

## Installation ⚙️

To get started with **Electrum XRP**, follow these simple steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/jackdev712/electrum-xrp.git
   ```

2. Install dependencies:
   ```bash
   cd electrum-xrp
   npm install
   ```

3. Run the wallet:
   ```bash
   npm run start
   ```

---

## Usage 🛠️

Generate a new XRP address and check the balance with ease:

```js
const { ElectrumXRP } = require('electrum-xrp');

// Initialize wallet with your secret key
const wallet = new ElectrumXRP({ secret: 's████████████████████████████████' });

// Generate a new address
const address = wallet.generateAddress();
console.log('Generated Address:', address);

// Check balance of the address
async function checkBalance() {
  try {
    const balance = await wallet.getBalance(address);
    console.log('Balance:', balance);
  } catch (err) {
    console.error('Error getting balance:', err);
  }
}

// Run balance check
checkBalance();
```

---

## License 📄

This project is licensed under the [MIT License](https://github.com/jackdev712/electrum-xrp/blob/main/license).

---

## Release 📦

Latest release: [v1.5.2](https://github.com/jackdev712/electrum-xrp/releases/tag/v1.5.2)

---

Thank you for using **Electrum XRP**! 🚀

