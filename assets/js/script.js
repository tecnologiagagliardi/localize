document.addEventListener('DOMContentLoaded', () => {
  const clientCodeInput = document.getElementById('client-code');
  const clientReferenceInput = document.getElementById('client-reference');
  const capturePhotoButton = document.getElementById('capture-photo');
  const restartProcessButton = document.getElementById('restart-process');
  const photoPreview = document.getElementById('photo-preview');
  const info = document.getElementById('info');
  const shareButton = document.getElementById('share-data');
  const mapContainer = document.getElementById('map');
  const mapTitle = document.getElementById('map-title');
  const phoneInput = document.getElementById('phone');
  const emailInput = document.getElementById('email');

  let clientCode = '';
  let photoBlob = null;
  let locationData = {};
  let map = null;

  // Validação do Código do Cliente
  const validateClientCode = (code) => /^C\d{6,7}$/.test(code);
  const sanitizeClientCode = (code) => code.toUpperCase().replace(/[^C0-9]/g, '');

  // Validação do telefone
  const validatePhone = (phone) => /^\(\d{2}\)\s?\d{5}-\d{4}$/.test(phone);
  const sanitizePhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  // Validação de e-mail
  const validateEmail = (email) => /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email);

  // Função para capturar a foto
  const capturePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: "environment" } },
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      const canvas = document.createElement('canvas');
      const capture = new Promise((resolve) => {
        video.addEventListener('loadedmetadata', () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext('2d').drawImage(video, 0, 0);
          stream.getTracks().forEach(track => track.stop());
          resolve(canvas.toDataURL('image/jpeg'));
        });
      });

      const photoDataURL = await capture;
      photoBlob = await (await fetch(photoDataURL)).blob();
      photoPreview.src = photoDataURL;
      photoPreview.style.display = 'block';
    } catch (error) {
      console.error('Erro ao acessar a câmera:', error);
      alert('Erro ao acessar a câmera!\n\nPermita que o APP acesse a câmera do dispositivo!');
    }
  };

  const getUserLocation = () =>
    new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject)
    );

  // Capturar foto e localização
  capturePhotoButton.addEventListener('click', async () => {
    clientCode = sanitizeClientCode(clientCodeInput.value);
    const phone = sanitizePhone(phoneInput.value);
    const email = emailInput.value;

    if (!validateClientCode(clientCode)) {
      alert('Código Cliente inválido!\n\nExemplo: C000001');
      return;
    }

    if (phone && !validatePhone(phone)) {
      alert('Telefone inválido!\n\nExemplo: (85) 91234-4321');
      return;
    }

    if (email && !validateEmail(email)) {
      alert('E-mail inválido!\n\nExemplo: exemplo@dominio.com');
      return;
    }

    try {
      await capturePhoto();

      const position = await getUserLocation();
      locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      info.innerHTML = `
        <strong>Código Cliente:</strong> ${clientCode}<br>
        <strong>Tel.:</strong> ${phone || 'Não fornecido'}<br>
        <strong>E-mail:</strong> ${email || 'Não fornecido'}<br>
        <strong>Ponto de referência</strong> ${client-reference || 'Não fornecido'}<br>
        <strong>Latitude:</strong> ${locationData.latitude.toFixed(6)}<br>
        <strong>Longitude:</strong> ${locationData.longitude.toFixed(6)}<br>
      `;

      mapTitle.style.display = 'block';
      shareButton.style.display = 'block';
      restartProcessButton.style.display = 'block';

      if (!map) {
        map = L.map('map').setView([locationData.latitude, locationData.longitude], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);
      } else {
        map.setView([locationData.latitude, locationData.longitude], 15);
        map.eachLayer(layer => {
          if (layer instanceof L.Marker) map.removeLayer(layer);
        });
      }

      L.marker([locationData.latitude, locationData.longitude])
        .addTo(map)
        .bindPopup(`Você está aqui!<br>Lat: ${locationData.latitude.toFixed(6)}<br>Lng: ${locationData.longitude.toFixed(6)}`)
        .openPopup();

    } catch (error) {
      console.error('Erro ao acessar a localização:', error);
      alert('Erro ao acessar a localização!\n\nVerifique se o GPS do dispositivo está ativo!');
    }
  });

  // Reiniciar
  restartProcessButton.addEventListener('click', () => {
    location.reload();
  });

  // Compartilhar
  shareButton.addEventListener('click', async () => {
    const textData = `Código Cliente: ${clientCode}\nTel.: ${phoneInput.value}\nE-mail: ${emailInput.value}\nLatitude: ${locationData.latitude.toFixed(6)}\nLongitude: ${locationData.longitude.toFixed(6)}`;

    try {
      await navigator.clipboard.writeText(textData);
      alert('Informações copiadas para a área de transferência!\n\nCaso apareça apenas a foto basta colar as informações!');
    } catch (error) {
      console.error('Erro ao copiar os dados:', error);
      alert('Clique em compartilhar!\n\nCaso apareça apenas a foto basta colar as informações!');
    }

    if (navigator.canShare && navigator.canShare({ files: [new File([photoBlob], `${clientCode}.jpg`, { type: 'image/jpeg' })] })) {
      try {
        const shareData = {
          title: 'Captura de Coordenadas',
          text: textData,
          files: [new File([photoBlob], `${clientCode}.jpg`, { type: 'image/jpeg' })],
        };
        await navigator.share(shareData);
      } catch (error) {
        console.log('Erro ao compartilhar os dados:', error);
        alert('Clique em compartilhar!\n\nCaso apareça apenas a foto basta colar as informações!');
      }
    } else if (navigator.share) {
      try {
        await navigator.share({ title: 'Cadastro de Cliente', text: textData });
      } catch (error) {
        console.log('Erro ao compartilhar texto:', error);
        alert('Clique em compartilhar!\n\nCaso apareça apenas a foto basta colar as informações!');
      }
    } else {
      alert('Seu dispositivo não suporta a funcionalidade de compartilhamento!');
    }
  });

  // Sanitize inputs em tempo real
  clientCodeInput.addEventListener('input', () => {
    clientCodeInput.value = sanitizeClientCode(clientCodeInput.value);
  });

  phoneInput.addEventListener('input', () => {
    phoneInput.value = sanitizePhone(phoneInput.value);
  });
});