// Ders seçildiğinde üniteleri güncelleyen fonksiyon
function updateUnitDropdown(dersSelect, unitSelect) {
    if (!dersSelect || !unitSelect) return;
    
    const secilenDers = dersSelect.value;
    
    // Ünite seçimini temizle
    unitSelect.innerHTML = '';
    
    // Varsayılan seçeneği ekle
    const varsayilanSecenek = document.createElement('option');
    varsayilanSecenek.value = '';
    varsayilanSecenek.textContent = 'Ünite seçin...';
    varsayilanSecenek.disabled = true;
    varsayilanSecenek.selected = true;
    unitSelect.appendChild(varsayilanSecenek);
    
    // Eğer ders seçilmediyse işlemi bitir
    if (!secilenDers) {
        return;
    }
    
    // Seçilen dersin ünitelerini al
    const ders = subjects[secilenDers];
    if (ders && ders.units) {
        // Her bir ünite için seçenek ekle
        Object.keys(ders.units).forEach(unitAdi => {
            const secenek = document.createElement('option');
            secenek.value = unitAdi;
            secenek.textContent = unitAdi;
            unitSelect.appendChild(secenek);
        });
    }
}

// Konu ekleme formu için
function konuEkleUstBirimleriGuncelle() {
    const dersSelect = document.getElementById('lessonSubject');
    const unitSelect = document.getElementById('lessonUnit');
    updateUnitDropdown(dersSelect, unitSelect);
}

// Soru ekleme formu için
function soruEkleUstBirimleriGuncelle() {
    const dersSelect = document.getElementById('questionSubject');
    const unitSelect = document.getElementById('questionUnit');
    updateUnitDropdown(dersSelect, unitSelect);
}

// Sayfa yüklendiğinde çalışacak kodlar
document.addEventListener('DOMContentLoaded', function() {
    // Konu ekleme formu için
    const konuDersSelect = document.getElementById('lessonSubject');
    if (konuDersSelect) {
        konuDersSelect.addEventListener('change', konuEkleUstBirimleriGuncelle);
    }

    // Soru ekleme formu için
    const soruDersSelect = document.getElementById('questionSubject');
    if (soruDersSelect) {
        soruDersSelect.addEventListener('change', soruEkleUstBirimleriGuncelle);
    }
});