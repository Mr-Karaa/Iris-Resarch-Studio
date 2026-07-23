/**
 * IRIS Research Studio - Electron Desktop Wrapper (main.js)
 * Masaüstü uygulaması olarak çalıştırmak için pencere yöneticisi.
 */

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'IRIS Research Studio',
    backgroundColor: '#080b14', // Aurora Dark arkaplan rengi
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // index.html yükle
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Üst menü barını kaldır (Daha modern ve temiz görünüm için)
  Menu.setApplicationMenu(null);

  // Pencere hazır olunca göster (Beyaz parlamayı engellemek için)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
