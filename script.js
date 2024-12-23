document.addEventListener('DOMContentLoaded', () => {
  const clientCodeInput = document.getElementById('client-code');
  const capturePhotoButton = document.getElementById('capture-photo');
  const restartProcessButton = document.getElementById('restart-process');
  const photoPreview = document.getElementById('photo-preview');
  const info = document.getElementById('info');
  const shareButton = document.getElementById('share-data');
  const mapContainer = document.getElementById('map');

  let clientCode = '';
  let photoBlob = null;
  let locationData = {};
  let map = null;

  // Validação do Código do Cliente
  clientCodeInput.addEventListener('input', () => {
    clientCodeInput.value = clientCodeInput.value.toUpperCase().replace(/[^C0-9]/g, '');
  });

  capturePhotoButton.addEventListener('click', async () => {
    clientCode = clientCodeInput.value;

    if (!/^C\d{6}$/.test(clientCode)) {
      alert('O código do cliente deve começar com "C" seguido de 6 números.');
      return;
    }

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

      navigator.geolocation.getCurrentPosition((position) => {
        locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        info.innerHTML = `
          <strong>Código do Cliente:</strong><br>${clientCode}<br>
          <strong>Latitude:</strong><br>${locationData.latitude.toFixed(6)}<br>
          <strong>Longitude:</strong><br>${locationData.longitude.toFixed(6)}
        `;

        shareButton.style.display = 'block';
        restartProcessButton.style.display = 'block';

        if (!map) {
          map = L.map('map').setView([locationData.latitude, locationData.longitude], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors',
          }).addTo(map);

          L.marker([locationData.latitude, locationData.longitude])
            .addTo(map)
            .bindPopup(`Você está aqui!<br>Lat: ${locationData.latitude.toFixed(6)}<br>Lng: ${locationData.longitude.toFixed(6)}`)
            .openPopup();
        } else {
          map.setView([locationData.latitude, locationData.longitude], 15);
        }
      });
    } catch (error) {
      console.error('Erro ao acessar a câmera ou localização:', error);
      alert('Erro ao acessar a câmera ou a localização!');
    }
  });

  restartProcessButton.addEventListener('click', () => {
    location.reload();
  });

  shareButton.addEventListener('click', async () => {
    const textData = `Código do Cliente: ${clientCode}\nLatitude: ${locationData.latitude.toFixed(6)}\nLongitude: ${locationData.longitude.toFixed(6)}`;

    // Verifica se o navegador suporta compartilhamento de arquivos
    if (navigator.canShare && navigator.canShare({ files: [new File([photoBlob], `${clientCode}.jpg`, { type: 'image/jpeg' })] })) {
      try {
        const shareData = {
          title: 'Captura de Coordenadas',
          text: textData,
          files: [new File([photoBlob], `${clientCode}.jpg`, { type: 'image/jpeg' })],
        };
        await navigator.share(shareData);
      } catch (error) {
        console.log('Erro ao compartilhar:', error);
        alert('Erro ao compartilhar os dados.');
      }
    } else if (navigator.share) {
      // Caso não suporte arquivos, compartilha apenas o texto
      try {
        await navigator.share({ title: 'Cadastro de Cliente', text: textData });
      } catch (error) {
        console.log('Erro ao compartilhar texto:', error);
        alert('Erro ao compartilhar o texto.');
      }
    } else {
      alert('Seu dispositivo não suporta a funcionalidade de compartilhamento.');
    }
  });
});
