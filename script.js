// Sayfa yüklendiğinde cache temizleme ve yeniden yükleme
document.addEventListener('DOMContentLoaded', function() {
    // Tüm localStorage verilerini temizle (cache temizliği için)
    if (window.location.search.includes('clearcache=true')) {
        localStorage.clear();
        console.log('🧹 Tüm cache temizlendi');
    }

    // Eğer F5 (yenile) tuşuna basıldıysa localStorage'ı temizle
    if (performance.getEntriesByType('navigation')[0] && performance.getEntriesByType('navigation')[0].type === 'reload') {
        localStorage.clear();
        console.log('🔄 Sayfa yenilendi, localStorage temizlendi');
    }
});
// Tüm fetch isteklerine otomatik cache-busting ekleme
const originalFetch = window.fetch;
window.fetch = function(...args) {
    // Eğer URL zaten ? içeriyorsa &timestamp= ekle, yoksa ?timestamp= ekle
    if (args[0] && typeof args[0] === 'string') {
        const separator = args[0].includes('?') ? '&' : '?';
        args[0] = args[0] + separator + 'timestamp=' + new Date().getTime();
    }
    return originalFetch.apply(this, args);
};

// Cache temizleme fonksiyonu
function clearAllCache() {
    if (confirm('Tüm cache temizlenecek ve sayfa yeniden yüklenecek. Devam edilsin mi?')) {
        localStorage.clear();
        // Tüm açık pencereleri yeniden yükle
        window.location.reload();
    }
}

// Tüm açık sekmelerde cache temizleme
function clearAllTabsCache() {
    if (confirm('Tüm açık sekmelerde cache temizlenecek. Devam edilsin mi?')) {
        localStorage.clear();
        // Tüm açık pencereleri yeniden yükle
        window.location.href = window.location.href + '?clearcache=true';
    }
}
const ADMIN_USERNAME = 'Lordastong';
const ADMIN_PASSWORD = 'berkay2121';

// Global değişkenler
let isAdminLoggedIn = false;
let subjects = {};
let lessons = [];
let exams = {};
let results = [];
let examStartTime = null;
let timerInterval = null;
let editingLessonId = null;
let editingQuestionData = null;
let currentExam = null;

// Unit dropdown güncelleme fonksiyonları
function updateUnitDropdown(subjectSelect, unitSelect) {
    if (!subjectSelect || !unitSelect) return;
    
    const selectedSubject = subjectSelect.value;
    
    // Clear the unit dropdown
    unitSelect.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Ünite seçin...';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    unitSelect.appendChild(defaultOption);
    
    // If no subject is selected, return
    if (!selectedSubject) {
        return;
    }
    
    // Get the units for the selected subject
    const subject = subjects[selectedSubject];
    if (subject && subject.units) {
        // Add units to the dropdown
        Object.keys(subject.units).forEach(unitName => {
            const option = document.createElement('option');
            option.value = unitName;
            option.textContent = unitName;
            unitSelect.appendChild(option);
        });
    }
}

function updateLessonUnits() {
    const subjectSelect = document.getElementById('lessonSubject');
    const unitSelect = document.getElementById('lessonUnit');
    updateUnitDropdown(subjectSelect, unitSelect);
}

function updateQuestionUnits() {
    const subjectSelect = document.getElementById('questionSubject');
    const unitSelect = document.getElementById('questionUnit');
    updateUnitDropdown(subjectSelect, unitSelect);
}

// Sayfa yüklendikten sonra
document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (window.pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        } else {
            console.warn('⚠️ pdfjsLib bulunamadı — PDF gösterme özellikleri devre dışı bırakılacak.');
        }

        // Login form event listener (varsa)
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.addEventListener('submit', handleLogin);

        // Session kontrolü
        checkSession();
    } catch (err) {
        console.error('DOMContentLoaded sırasında beklenmedik hata:', err);
        // Hata olsa bile session kontrolünü dene
        try { checkSession(); } catch(e) { console.error(e); }
    }
});

// Login kontrol
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        isAdminLoggedIn = true;
        sessionStorage.setItem('isAdmin', 'true');
        initializeAfterLogin();
    } else {
        showLoginError();
    }
}

// Misafir girişi
function skipLogin() {
    isAdminLoggedIn = false;
    sessionStorage.setItem('isAdmin', 'false');
    initializeAfterLogin();
}

// Login hatası göster
function showLoginError() {
    const form = document.getElementById('loginForm');
    let errorDiv = document.querySelector('.login-error');
    
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'login-error';
        form.insertBefore(errorDiv, form.firstChild);
    }
    
    errorDiv.textContent = '❌ Kullanıcı adı veya şifre hatalı!';
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// Session kontrolü
function checkSession() {
    const isAdmin = sessionStorage.getItem('isAdmin');
    
    if (isAdmin === 'true') {
        isAdminLoggedIn = true;
        initializeAfterLogin();
    } else if (isAdmin === 'false') {
        isAdminLoggedIn = false;
        initializeAfterLogin();
    }
}

async function initializeAfterLogin() {
    const loadingScreenEl = document.getElementById('loadingScreen');
    const loginScreenEl = document.getElementById('loginScreen');
    const navbarEl = document.getElementById('navbar');

    try {
        // Login ekranını gizle (varsa)
        if (loginScreenEl) loginScreenEl.style.display = 'none';

        // Loading ekranını göster (varsa)
        if (loadingScreenEl) loadingScreenEl.style.display = 'flex';

        // Navbar'ı göster (varsa)
        if (navbarEl) navbarEl.style.display = 'block';

        // Admin modunu ayarla
        if (isAdminLoggedIn) {
            document.body.classList.add('admin-mode');
            const addContent = document.getElementById('navAddContent');
            const settings = document.getElementById('navSettings');
            if (addContent) addContent.style.display = 'block';
            if (settings) settings.style.display = 'block';
        } else {
            document.body.classList.remove('admin-mode');
            const addContent = document.getElementById('navAddContent');
            const settings = document.getElementById('navSettings');
            if (addContent) addContent.style.display = 'none';
            if (settings) settings.style.display = 'none';
        }

        // Önce localStorage'dan yükle
        loadData();

        // Eğer uygulama verileri gerçekten boşsa (localStorage içinde rastgele anahtar olsa bile) data.json'dan yükle
        const noAppData = (Object.keys(subjects).length === 0 && lessons.length === 0 && Object.keys(exams).length === 0);
        if (noAppData) {
            console.log('📦 Uygulama verisi boş — public/data.txt kontrol ediliyor...');
            await loadAndSaveFromDataTxt();
        } else {
            console.log('✅ Uygulama verisi bulundu, localStorage verileri kullanılıyor.');
        }

        // Uygulamayı başlat (render ve UI güncelleme)
        initializeApp();
    } catch (error) {
        console.error('initializeAfterLogin sırasında hata:', error);
        // Hatalı durumlarda kullanıcıya bilgi ver (isteğe bağlı)
        // alert('Uygulama başlatılırken bir hata oluştu. Konsolu kontrol edin.');
    } finally {
        // Her durumda loading ekranını kapat ve ana sayfayı göster (hata olsa bile)
        try {
            if (loadingScreenEl) loadingScreenEl.style.display = 'none';
            // Eğer home sayfası yoksa güvenle showPage çağrısı atla
            if (document.getElementById('home')) showPage('home');
        } catch (e) {
            console.error('Loading ekranı gizlenirken hata:', e);
        }
    }
}

// Çıkış yap
function logout() {
    if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
        sessionStorage.removeItem('isAdmin');
        location.reload();
    }
}

// public/data.txt dosyasından veriyi al ve kaydet
async function loadAndSaveFromDataTxt() {
    try {
        console.log('🔍 public/data.txt yükleniyor...');
        // fetch yolunu projenizin yapısına göre ayarlayın. Genelde public/data.txt kökten erişilebilir.
        const response = await fetch('public/data.txt?' + new Date().getTime());

        if (!response.ok) {
            console.warn(`⚠️ public/data.txt bulunamadı veya erişilemiyor (HTTP ${response.status}).`);
            return;
        }

        const data = await response.json();
        console.log('📄 data.txt dosyası okundu:', data);

        // Verileri güvenli şekilde yükle
        subjects = data.subjects && typeof data.subjects === 'object' ? data.subjects : {};
        lessons = Array.isArray(data.lessons) ? data.lessons : [];
        exams = data.exams && typeof data.exams === 'object' ? data.exams : {};
        results = []; // Sonuçlar her zaman yerel kalmalı, txt'dan çekilmez.

        // LocalStorage'a kaydet
        saveData();

        console.log('✅ public/data.txt\'dan veriler yüklendi ve kaydedildi.');
    } catch (error) {
        console.error('❌ data.txt yüklenirken hata:', error);
    }
}

// public/data.txt'den manuel yeniden yükle
async function reloadFromDataTxt() {
    if (confirm('Mevcut yerel veriler silinecek ve public/data.txt dosyasından tekrar yüklenecek. Devam edilsin mi?')) {
        localStorage.clear();
        location.reload();
    }
}

// Local Storage'dan veri yükle
async function loadData() {
    try {
        // Önce localStorage'dan yükle
        const savedSubjects = localStorage.getItem('subjects');
        const savedLessons = localStorage.getItem('lessons');
        const savedExams = localStorage.getItem('exams');
        const savedResults = localStorage.getItem('results');
        
        if (savedSubjects) subjects = JSON.parse(savedSubjects);
        if (savedLessons) lessons = JSON.parse(savedLessons);
        if (savedExams) exams = JSON.parse(savedExams);
        if (savedResults) results = JSON.parse(savedResults);
        
        console.log('💾 LocalStorage yüklendi');
        
        // Her zaman data.txt'den güncel veriyi yükle (F5 için) - cache busting ile
        if (typeof fetch === 'function') {
            try {
                const response = await fetch('public/data.txt?' + new Date().getTime());
                if (response.ok) {
                    const responseText = await response.text();
                    if (responseText.trim() !== '') {
                        const data = JSON.parse(responseText);
                        
                        // Eğer data.txt'de veri varsa kullan (F5 için her zaman güncel olsun)
                        if (data.subjects) subjects = data.subjects;
                        if (data.lessons) lessons = data.lessons;
                        if (data.exams) exams = data.exams;
                        // results'ı data.txt'den alma, localStorage'da kalsın
                        
                        // LocalStorage'e kaydet
                        saveData();
                        console.log('💾 data.txt yüklendi ve LocalStorage\'a kaydedildi (F5 yenileme)');
                    }
                }
            } catch (error) {
                console.error('data.txt yüklenirken hata oluştu:', error);
            }
        }
        
        // Hala veri yoksa örnek veri ekle
        if (Object.keys(subjects).length === 0 && lessons.length === 0) {
            console.log('ℹ️ Örnek veri yükleniyor...');
            addSampleData();
        }
        
        // UI'ı güncelle
        updateStats();
        renderLessonsAccordion();
        renderExamsAccordion();
        populateSubjectDropdowns();
        
    } catch (error) {
        console.error('Veri yüklenirken hata oluştu:', error);
    } finally {
        // Yükleme ekranını kapat
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
}

// Veri kaydet
function saveData() {
    try {
        localStorage.setItem('subjects', JSON.stringify(subjects));
        localStorage.setItem('lessons', JSON.stringify(lessons));
        localStorage.setItem('exams', JSON.stringify(exams));
        localStorage.setItem('results', JSON.stringify(results));
        console.log('💾 Veriler localStorage\'a kaydedildi');
    } catch (error) {
        console.error('LocalStorage kaydetme hatası:', error);
    }
}

// Uygulamayı başlat
function initializeApp() {
    updateStats();
    renderLessonsAccordion();
    
    // Ders ve ünite seçim alanlarını doldur
    populateSubjectDropdowns();
    
    // Eğer ders seçiliyse, ünite seçim alanlarını güncelle
    const lessonSubject = document.getElementById('lessonSubject');
    const questionSubject = document.getElementById('questionSubject');
    
    if (lessonSubject && lessonSubject.value) {
        updateLessonUnits();
    }
    
    if (questionSubject && questionSubject.value) {
        updateQuestionUnits();
    }
    renderExamsAccordion();
    renderResults();
    renderSubjects();
    populateSubjectDropdowns();
    
    // Initialize the unit addition form's subject dropdown
    const unitSubjectSelect = document.getElementById('unitSubject');
    if (unitSubjectSelect) {
        // Clear existing options
        unitSubjectSelect.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Ders seçin...';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        unitSubjectSelect.appendChild(defaultOption);
        
        // Add subjects
        Object.keys(subjects).forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            unitSubjectSelect.appendChild(option);
        });
    }
    
}

// Sayfa göster
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    
    // Sayfa ID'sine göre doğru nav linkini bul ve aktif yap
    const navLink = document.querySelector(`.nav-link[onclick="showPage('${pageId}')"]`);
    if (navLink) navLink.classList.add('active');
}

// Tab göster
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId)?.classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
}

// İstatistikleri güncelle
function updateStats() {
    const totalQuestions = Object.values(exams).reduce((sum, exam) => sum + exam.length, 0);
    const avgScore = results.length > 0 
        ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
        : 0;
    
    document.getElementById('totalLessons').textContent = lessons.length;
    document.getElementById('totalQuestions').textContent = totalQuestions;
    document.getElementById('completedExams').textContent = results.length;
    document.getElementById('avgScore').textContent = avgScore + '%';
}

// Konuları Accordion ile render et
function renderLessonsAccordion() {
    const container = document.getElementById('lessonsAccordion');
    
    if (lessons.length === 0) {
        container.innerHTML = `<div class="accordion-empty"><div class="accordion-empty-icon">📚</div><p class="accordion-empty-text">Henüz konu eklenmemiş. ${isAdminLoggedIn ? 'İçerik Ekle sayfasından yeni konu ekleyebilirsin!' : ''}</p></div>`;
        return;
    }
    
    const groupedBySubject = {};
    lessons.forEach(lesson => {
        if (!groupedBySubject[lesson.subject]) groupedBySubject[lesson.subject] = {};
        if (!groupedBySubject[lesson.subject][lesson.unit]) groupedBySubject[lesson.subject][lesson.unit] = [];
        groupedBySubject[lesson.subject][lesson.unit].push(lesson);
    });
    
    container.innerHTML = Object.keys(groupedBySubject).map(subject => {
        const units = groupedBySubject[subject];
        const totalLessons = Object.values(units).reduce((sum, l) => sum + l.length, 0);
        return `
            <div class="subject-accordion">
                <div class="subject-accordion-header" onclick="toggleSubjectAccordion(this)">
                    <div class="subject-accordion-title">
                        <span class="subject-icon">📚</span>
                        <div class="subject-text">
                            <div class="subject-name-text">${subject}</div>
                            <div class="subject-count">${totalLessons} konu • ${Object.keys(units).length} ünite</div>
                        </div>
                    </div><span class="accordion-arrow">▶</span>
                </div>
                <div class="subject-accordion-content">
                    <div class="units-accordion">
                        ${Object.keys(units).map(unit => `
                            <div class="unit-accordion">
                                <div class="unit-accordion-header" onclick="toggleUnitAccordion(this)">
                                    <div class="unit-accordion-title">
                                        <span class="unit-icon">📖</span>
                                        <span class="unit-name-text">${unit}</span>
                                        <span class="unit-count">(${units[unit].length} konu)</span>
                                    </div><span class="unit-arrow">▶</span>
                                </div>
                                <div class="unit-accordion-content">
                                    <div class="unit-items-grid">
                                        ${units[unit].map(lesson => `
                                            <div class="unit-lesson-card">
                                                <div class="unit-lesson-title">📝 ${lesson.title}</div>
                                                <div class="lesson-card-buttons">
                                                    <button class="lesson-btn-small" onclick="openSummary(${lesson.id})">📝 Konu Özeti</button>
                                                    ${lesson.pdfData ? `<button class="lesson-btn-small secondary" onclick="openPdf(${lesson.id})">📄 PDF Aç</button>` : ''}
                                                    ${isAdminLoggedIn ? `<button class="lesson-btn-small btn-edit admin-only" onclick="openEditLesson(${lesson.id})">✏️ Düzenle</button>` : ''}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>`).join('')}
                    </div>
                </div>
            </div>`;
    }).join('');
}

// Sınavları Accordion ile render et
function renderExamsAccordion() {
    const container = document.getElementById('examsAccordion');
    
    if (Object.keys(exams).length === 0) {
        container.innerHTML = `<div class="accordion-empty"><div class="accordion-empty-icon">📝</div><p class="accordion-empty-text">Henüz sınav eklenmemiş. ${isAdminLoggedIn ? 'İçerik Ekle sayfasından yeni sorular ekleyebilirsin!' : ''}</p></div>`;
        return;
    }
    
    const groupedBySubject = {};
    Object.keys(exams).forEach(examKey => {
        const [subject, unit, examName] = examKey.split(' - ');
        if (!groupedBySubject[subject]) groupedBySubject[subject] = {};
        if (!groupedBySubject[subject][unit]) groupedBySubject[subject][unit] = {};
        groupedBySubject[subject][unit][examName] = exams[examKey];
    });
    
    container.innerHTML = Object.keys(groupedBySubject).map(subject => {
        const units = groupedBySubject[subject];
        const totalExams = Object.values(units).reduce((sum, e) => sum + Object.keys(e).length, 0);
        return `
            <div class="subject-accordion">
                <div class="subject-accordion-header" onclick="toggleSubjectAccordion(this)">
                    <div class="subject-accordion-title">
                        <span class="subject-icon">📚</span>
                        <div class="subject-text">
                            <div class="subject-name-text">${subject}</div>
                            <div class="subject-count">${totalExams} sınav • ${Object.keys(units).length} ünite</div>
                        </div>
                    </div><span class="accordion-arrow">▶</span>
                </div>
                <div class="subject-accordion-content">
                    <div class="units-accordion">
                        ${Object.keys(units).map(unit => {
                            const examsList = units[unit];
                            return `
                                <div class="unit-accordion">
                                    <div class="unit-accordion-header" onclick="toggleUnitAccordion(this)">
                                        <div class="unit-accordion-title">
                                            <span class="unit-icon">📖</span>
                                            <span class="unit-name-text">${unit}</span>
                                            <span class="unit-count">(${Object.keys(examsList).length} sınav)</span>
                                        </div><span class="unit-arrow">▶</span>
                                    </div>
                                    <div class="unit-accordion-content">
                                        <div class="unit-items-grid">
                                            ${Object.keys(examsList).map(examName => {
                                                const examQuestions = examsList[examName];
                                                const examKey = `${subject} - ${unit} - ${examName}`;
                                                return `
                                                    <div class="unit-exam-card">
                                                        <div class="unit-exam-title">📝 ${examName}</div>
                                                        <span class="exam-badge-small">${examQuestions.length} Soru</span>
                                                        <div class="exam-info-small"><div class="exam-info-item-small"><span>⏱️</span><span>${examQuestions.length * 2} dk</span></div></div>
                                                        <div class="lesson-card-buttons">
                                                            <button class="lesson-btn-small" onclick="startExam('${examKey}')">🎯 Sınava Başla</button>
                                                            ${isAdminLoggedIn ? `
                                                                <button class="lesson-btn-small btn-edit admin-only" onclick="manageExamQuestions('${examKey}')">✏️ Soruları Düzenle (${examQuestions.length})</button>
                                                                <button class="lesson-btn-small admin-only" style="background: rgba(244, 67, 54, 0.1); color: var(--accent-danger); border-color: var(--accent-danger);" onclick="deleteExam('${examKey}')">🗑️ Sınavı Sil</button>
                                                            ` : ''}
                                                        </div>
                                                    </div>`;
                                            }).join('')}
                                        </div>
                                    </div>
                                </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>`;
    }).join('');
}

// Accordion toggle fonksiyonları
function toggleSubjectAccordion(element) { element.parentElement.classList.toggle('active'); }
function toggleUnitAccordion(element) { element.parentElement.classList.toggle('active'); }

// Ders ve Ünite Yönetimi
function updateUnitSubjectDropdown() {
    const unitSubjectSelect = document.getElementById('unitSubject');
    if (!unitSubjectSelect) return;
    
    // Mevcut seçili değeri sakla
    const currentValue = unitSubjectSelect.value;
    
    // Select elementini temizle
    unitSubjectSelect.innerHTML = '';
    
    // Varsayılan seçeneği ekle
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Ders seçin...';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    unitSubjectSelect.appendChild(defaultOption);
    
    // Dersleri ekle
    const subjectNames = Object.keys(subjects);
    subjectNames.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        unitSubjectSelect.appendChild(option);
    });
    
    // Eğer önceden seçili bir değer varsa ve hala mevcutsa, onu seçili yap
    if (currentValue && subjectNames.includes(currentValue)) {
        unitSubjectSelect.value = currentValue;
    }
}

function addSubject() {
    const subjectName = document.getElementById('newSubject').value.trim();
    if (!subjectName) { 
        alert('Lütfen ders adı girin!'); 
        return; 
    }
    if (subjects[subjectName]) { 
        alert('Bu ders zaten mevcut!'); 
        return; 
    }
    
    // Add the new subject with an empty units object
    subjects[subjectName] = {
        units: {}
    };
    saveData();
    
    // Update the UI
    renderSubjects();
    populateSubjectDropdowns();
    
    // Clear the form
    document.getElementById('newSubject').value = '';
    
    alert('✅ Ders başarıyla eklendi!');
}

function addUnit() {
    const subjectName = document.getElementById('unitSubject').value;
    const unitName = document.getElementById('newUnit').value.trim();
    
    if (!subjectName) { 
        showAlert('Lütfen bir ders seçin!', 'error');
        return; 
    }
    
    if (!unitName) { 
        showAlert('Lütfen ünite adı girin!', 'error');
        return; 
    }
    
    // Eğer ders yoksa oluştur
    if (!subjects[subjectName]) {
        subjects[subjectName] = { units: {} };
    }
    
    // Eğer units objesi yoksa oluştur
    if (!subjects[subjectName].units) {
        subjects[subjectName].units = {};
    }
    
    // Ünite zaten var mı kontrol et
    if (subjects[subjectName].units[unitName]) { 
        showAlert('Bu ünite zaten mevcut!', 'warning');
        return; 
    }
    
    // Yeni üniteyi ekle
    subjects[subjectName].units[unitName] = true;
    saveData();
    
    // Arayüzü güncelle
    renderSubjects();
    populateSubjectDropdowns();
    
    // Ünite seçim alanlarını güncelle
    updateLessonUnits();
    updateQuestionUnits();
    
    // Formu temizle
    document.getElementById('newUnit').value = '';
    
    // Başarı mesajı göster
    showAlert('✅ Ünite başarıyla eklendi!', 'success');
}

function showAlert(message, type = 'info') {
    // Mevcut alert'leri temizle
    const existingAlerts = document.querySelectorAll('.custom-alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Yeni alert oluştur
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert ${type}`;
    alertDiv.textContent = message;
    
    // Sayfaya ekle
    document.body.appendChild(alertDiv);
    
    // 3 saniye sonra kaldır
    setTimeout(() => {
        alertDiv.classList.add('fade-out');
        setTimeout(() => alertDiv.remove(), 300);
    }, 3000);
}

function populateSubjectDropdowns() {
    // Tüm ders seçim alanlarını seç
    const dersSecimAlanlari = [
        'lessonSubject',  // Konu ekleme formu
        'questionSubject', // Soru ekleme formu
        'unitSubject'     // Ünite yönetimi formu
    ];

    dersSecimAlanlari.forEach(alanId => {
        const secimAlani = document.getElementById(alanId);
        if (!secimAlani) return;

        // Mevcut seçili değeri kaydet
        const mevcutDeger = secimAlani.value;
        
        // Seçim alanını temizle ve varsayılan seçeneği ekle
        secimAlani.innerHTML = '<option value="" disabled selected>Ders seçin...</option>';
        
        // Tüm dersleri ekle
        Object.keys(subjects).forEach(dersAdi => {
            const secenek = document.createElement('option');
            secenek.value = dersAdi;
            secenek.textContent = dersAdi;
            secimAlani.appendChild(secenek);
        });

        // Eğer önceden seçili bir ders varsa ve hala mevcutsa, onu seçili yap
        if (mevcutDeger && subjects[mevcutDeger]) {
            secimAlani.value = mevcutDeger;
        }
    });
    
    // Eğer unitSubject dropdown'ı varsa ve hiç ders yoksa uyarı göster
    const unitSubjectSelect = document.getElementById('unitSubject');
    if (unitSubjectSelect && Object.keys(subjects).length === 0) {
        const warningOption = document.createElement('option');
        warningOption.value = '';
        warningOption.textContent = 'Lütfen önce ders ekleyin';
        warningOption.disabled = true;
        warningOption.selected = true;
        unitSubjectSelect.innerHTML = '';
        unitSubjectSelect.appendChild(warningOption);
    }
    
    // Eğer unitSubject seçiliyse, üniteleri güncelle
    if (unitSubjectSelect && unitSubjectSelect.value) {
        updateUnitDropdown(unitSubjectSelect, document.getElementById('unitUnit'));
    }
}

function renderSubjects() {
    const container = document.getElementById('subjectsList');
    if (!container) return;
    
    if (Object.keys(subjects).length === 0) {
        container.innerHTML = '<p class="empty-text">Henüz ders eklenmemiş.</p>';
        return;
    }
    
    container.innerHTML = Object.entries(subjects).map(([subject, subjectData]) => {
        // Eğer subjectData bir dizi ise, eski formatta demektir, yeni formata çevir
        if (Array.isArray(subjectData)) {
            const units = {};
            subjectData.forEach(unit => {
                units[unit] = true;
            });
            subjects[subject] = { units };
            saveData();
            subjectData = subjects[subject];
        }
        
        // Eğer units objesi yoksa oluştur
        if (!subjectData.units) {
            subjectData.units = {};
            saveData();
        }
        
        const units = Object.keys(subjectData.units || {});
        const unitList = units.length > 0 
            ? units.map(unit => `
                <div class="unit-item">
                    <span>📖 ${unit}</span>
                    <button class="delete-btn" onclick="deleteUnit('${subject.replace(/'/g, "\\'")}', '${unit.replace(/'/g, "\\'")}')">🗑️</button>
                </div>`).join('')
            : '<p style="color: var(--text-secondary); padding: 0.5rem;">Henüz ünite eklenmemiş</p>';
        
        return `
        <div class="subject-item">
            <div class="subject-header">
                <span class="subject-name">📚 ${subject}</span>
                <button class="delete-btn" onclick="deleteSubject('${subject.replace(/'/g, "\\'")}')">🗑️ Sil</button>
            </div>
            <div class="units-list">
                ${unitList}
            </div>
        </div>`;
    }).join('');
}

function deleteSubject(subjectName) {
    if (confirm(`"${subjectName}" dersini ve tüm içeriğini silmek istediğinizden emin misiniz?`)) {
        delete subjects[subjectName];
        lessons = lessons.filter(l => l.subject !== subjectName);
        Object.keys(exams).forEach(key => { if (key.startsWith(subjectName)) delete exams[key]; });
        saveData();
        initializeApp();
        alert('✅ Ders silindi!');
    }
}

function deleteUnit(subjectName, unitName) {
    if (!confirm(`"${unitName}" ünitesini ve tüm içeriğini silmek istediğinizden emin misiniz?`)) {
        return;
    }
    
    // Eğer subject yoksa veya units objesi yoksa işlemi iptal et
    if (!subjects[subjectName] || !subjects[subjectName].units) {
        alert('Hata: Ders veya ünite bulunamadı!');
        return;
    }
    
    // Üniteyi sil
    if (subjects[subjectName].units[unitName]) {
        delete subjects[subjectName].units[unitName];
        
        // İlgili dersleri ve sınavları sil
        lessons = lessons.filter(l => !(l.subject === subjectName && l.unit === unitName));
        Object.keys(exams).forEach(key => { 
            if (key.startsWith(`${subjectName} - ${unitName}`)) {
                delete exams[key];
            }
        });
        
        saveData();
        initializeApp();
        alert('✅ Ünite silindi!');
    } else {
        alert('Hata: Ünite bulunamadı!');
    }
}

// Konu Yönetimi
function addLesson() {
    const subject = document.getElementById('lessonSubject').value;
    const unit = document.getElementById('lessonUnit').value;
    const title = document.getElementById('lessonTitle').value.trim();
    const summary = document.getElementById('lessonSummary').value.trim();
    const pdfFile = document.getElementById('lessonPdf').files[0];
    
    if (!subject || !unit || !title || !summary) {
        alert('Lütfen ders, ünite, başlık ve özet alanlarını doldurun!');
        return;
    }
    
    if (pdfFile) {
        const reader = new FileReader();
        reader.onload = e => saveLessonData(subject, unit, title, summary, e.target.result);
        reader.readAsDataURL(pdfFile);
    } else {
        saveLessonData(subject, unit, title, summary, null);
    }
}

function saveLessonData(subject, unit, title, summary, pdfData) {
    lessons.push({ id: Date.now(), subject, unit, title, summary, pdfData, createdAt: new Date().toISOString() });
    saveData();
    renderLessonsAccordion();
    updateStats();
    document.getElementById('lessonTitle').value = '';
    document.getElementById('lessonSummary').value = '';
    document.getElementById('lessonPdf').value = '';
    alert('✅ Konu başarıyla eklendi!');
}

function openEditLesson(lessonId) {
    if (!isAdminLoggedIn) return;
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return;
    editingLessonId = lessonId;
    document.getElementById('editLessonTitle').value = lesson.title;
    document.getElementById('editLessonSummary').value = lesson.summary;
    document.getElementById('editLessonPdf').value = '';
    document.getElementById('editLessonModal').classList.add('active');
}

function updateLesson() {
    const lessonIndex = lessons.findIndex(l => l.id === editingLessonId);
    if (lessonIndex === -1) return;
    
    const title = document.getElementById('editLessonTitle').value.trim();
    const summary = document.getElementById('editLessonSummary').value.trim();
    const pdfFile = document.getElementById('editLessonPdf').files[0];
    
    if (!title || !summary) { alert('Başlık ve özet boş bırakılamaz!'); return; }
    
    lessons[lessonIndex].title = title;
    lessons[lessonIndex].summary = summary;
    
    if (pdfFile) {
        const reader = new FileReader();
        reader.onload = e => {
            lessons[lessonIndex].pdfData = e.target.result;
            finishLessonUpdate();
        };
        reader.readAsDataURL(pdfFile);
    } else {
        finishLessonUpdate();
    }
}

function finishLessonUpdate() {
    saveData();
    renderLessonsAccordion();
    closeEditLessonModal();
    alert('✅ Konu güncellendi!');
}

function deleteLessonFromModal() {
    if (confirm('Bu konuyu silmek istediğinizden emin misiniz?')) {
        lessons = lessons.filter(l => l.id !== editingLessonId);
        saveData();
        renderLessonsAccordion();
        updateStats();
        closeEditLessonModal();
        alert('✅ Konu silindi!');
    }
}

function closeEditLessonModal() {
    document.getElementById('editLessonModal').classList.remove('active');
    editingLessonId = null;
}

// Soru Yönetimi
function addQuestion() {
    const subject = document.getElementById('questionSubject').value;
    const unit = document.getElementById('questionUnit').value;
    const examName = document.getElementById('examName').value.trim();
    const questionText = document.getElementById('questionText').value.trim();
    const options = {
        A: document.getElementById('optionA').value.trim(),
        B: document.getElementById('optionB').value.trim(),
        C: document.getElementById('optionC').value.trim(),
        D: document.getElementById('optionD').value.trim(),
        E: document.getElementById('optionE').value.trim(),
    };
    const correctAnswer = document.getElementById('correctAnswer').value;
    
    if (!subject || !unit || !examName || !questionText || Object.values(options).some(o => !o) || !correctAnswer) {
        alert('Lütfen tüm alanları doldurun!');
        return;
    }
    
    const examKey = `${subject} - ${unit} - ${examName}`;
    if (!exams[examKey]) exams[examKey] = [];
    
    exams[examKey].push({ id: Date.now(), text: questionText, options, correctAnswer });
    saveData();
    renderExamsAccordion();
    updateStats();
    
    ['questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'optionE', 'correctAnswer'].forEach(id => document.getElementById(id).value = '');
    
    const message = document.getElementById('questionAddedMessage');
    message.style.display = 'block';
    message.textContent = `✅ ${exams[examKey].length}. soru eklendi!`;
    setTimeout(() => { message.style.display = 'none'; }, 3000);
    document.getElementById('questionText').focus();
}

function manageExamQuestions(examKey) {
    if (!isAdminLoggedIn) return;
    const examQuestions = exams[examKey];
    if (!examQuestions || examQuestions.length === 0) return;
    
    let html = '<div style="max-height: 60vh; overflow-y: auto;">';
    examQuestions.forEach((q, index) => {
        html += `
            <div style="background: var(--bg-secondary); padding: 1rem; margin-bottom: 1rem; border-radius: 8px; border: 2px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <strong style="color: var(--accent-primary);">Soru ${index + 1}</strong>
                    <button class="btn-edit" onclick="openEditQuestion('${examKey}', ${index})">✏️ Düzenle</button>
                </div>
                <p style="color: var(--text-secondary); font-size: 0.9rem;">${q.text.substring(0, 100)}${q.text.length > 100 ? '...' : ''}</p>
                <p style="color: var(--accent-success); font-size: 0.85rem; margin-top: 0.5rem;">Doğru Cevap: ${q.correctAnswer}</p>
            </div>`;
    });
    html += '</div>';
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content"><div class="modal-header"><h3>✏️ Soruları Düzenle</h3><button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button></div><div class="modal-body">${html}</div></div>`;
    document.body.appendChild(modal);
}

function openEditQuestion(examKey, questionIndex) {
    const question = exams[examKey][questionIndex];
    if (!question) return;
    
    editingQuestionData = { examKey, questionIndex };
    
    document.getElementById('editQuestionText').value = question.text;
    document.getElementById('editOptionA').value = question.options.A;
    document.getElementById('editOptionB').value = question.options.B;
    document.getElementById('editOptionC').value = question.options.C;
    document.getElementById('editOptionD').value = question.options.D;
    document.getElementById('editOptionE').value = question.options.E;
    document.getElementById('editCorrectAnswer').value = question.correctAnswer;
    
    document.querySelectorAll('.modal').forEach(m => { if (m.id !== 'editQuestionModal') m.remove(); });
    document.getElementById('editQuestionModal').classList.add('active');
}

function updateQuestion() {
    if (!editingQuestionData) return;
    const { examKey, questionIndex } = editingQuestionData;
    
    const updatedQuestion = {
        id: exams[examKey][questionIndex].id,
        text: document.getElementById('editQuestionText').value.trim(),
        options: {
            A: document.getElementById('editOptionA').value.trim(),
            B: document.getElementById('editOptionB').value.trim(),
            C: document.getElementById('editOptionC').value.trim(),
            D: document.getElementById('editOptionD').value.trim(),
            E: document.getElementById('editOptionE').value.trim(),
        },
        correctAnswer: document.getElementById('editCorrectAnswer').value
    };
    
    if (!updatedQuestion.text || Object.values(updatedQuestion.options).some(o => !o) || !updatedQuestion.correctAnswer) {
        alert('Tüm alanları doldurun!');
        return;
    }
    
    exams[examKey][questionIndex] = updatedQuestion;
    saveData();
    renderExamsAccordion();
    closeEditQuestionModal();
    alert('✅ Soru güncellendi!');
}

function deleteQuestion() {
    if (!editingQuestionData) return;
    if (confirm('Bu soruyu silmek istediğinizden emin misiniz?')) {
        const { examKey, questionIndex } = editingQuestionData;
        exams[examKey].splice(questionIndex, 1);
        if (exams[examKey].length === 0) delete exams[examKey];
        saveData();
        renderExamsAccordion();
        closeEditQuestionModal();
        alert('✅ Soru silindi!');
    }
}

function closeEditQuestionModal() {
    document.getElementById('editQuestionModal').classList.remove('active');
    editingQuestionData = null;
}

function deleteExam(examKey) {
    if (!isAdminLoggedIn) return;
    if (confirm(`"${examKey}" sınavını ve tüm sorularını silmek istediğinizden emin misiniz?`)) {
        delete exams[examKey];
        saveData();
        renderExamsAccordion();
        updateStats();
        alert('✅ Sınav silindi!');
    }
}

// Sınav Çözme
function startExam(examKey) {
    // Try to find the exam with the exact key first
    if (!exams[examKey]) {
        // If not found, try to find a matching exam by checking all keys
        const keyParts = examKey.split(' - ');
        if (keyParts.length >= 3) {
            const matchingKey = Object.keys(exams).find(key => 
                key.includes(keyParts[0]) &&  // Match subject
                key.includes(keyParts[1]) &&  // Match unit
                key.includes(keyParts[2])     // Match exam name
            );
            
            if (matchingKey) {
                console.log(`Found matching exam with key: ${matchingKey}`);
                examKey = matchingKey;  // Use the found key
            }
        }
        
        if (!exams[examKey]) {
            alert('Sınav bulunamadı. Lütfen tekrar deneyin veya yöneticiye başvurun.');
            console.error('Exam not found:', examKey);
            console.log('Available exam keys:', Object.keys(exams));
            return;
        }
    }
    
    currentExam = { 
        key: examKey, 
        questions: Array.isArray(exams[examKey]) ? exams[examKey] : [], 
        answers: {} 
    };
    
    if (currentExam.questions.length === 0) {
        alert('Bu sınavda henüz soru bulunmuyor.');
        return;
    }
    
    examStartTime = Date.now();
    startTimer();
    document.getElementById('examTitle').textContent = examKey;
    renderQuestions();
    document.getElementById('submitExamBtn').style.display = 'flex';
    document.getElementById('examModal').classList.add('active');
}

// Sınav verilerini kontrol etmek için yardımcı fonksiyon
function checkExamData() {
    console.log("Mevcut sınav anahtarları:", Object.keys(exams));
    Object.entries(exams).forEach(([key, value]) => {
        console.log(`Sınav: ${key}`);
        console.log(`Soru sayısı: ${Array.isArray(value) ? value.length : 'Geçersiz format (dizi değil)'}`);
        if (Array.isArray(value) && value.length > 0) {
            console.log('İlk soru örneği:', JSON.stringify(value[0], null, 2));
        }
    });
    
    // Tüm sınav anahtarlarını ve soru sayılarını gösteren bir uyarı
    const examInfo = Object.entries(exams).map(([key, value]) => {
        return `${key}: ${Array.isArray(value) ? value.length : '0'} soru`;
    }).join('\n');
    
    alert(`Sınav Bilgileri:\n\n${examInfo || 'Hiç sınav bulunamadı.'}\n\nDetaylar için konsolu kontrol edin.`);
}

function startTimer() {
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - examStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('timerDisplay').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

function renderQuestions() {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = currentExam.questions.map((q, index) => `
        <div class="question-item">
            <div class="question-number">Soru ${index + 1}</div>
            <div class="question-text">${q.text}</div>
            <div class="options">
                ${Object.keys(q.options).map(key => `
                    <label class="option">
                        <input type="radio" name="question-${index}" value="${key}" onchange="saveAnswer(${index}, '${key}')">
                        <span><strong>${key})</strong> ${q.options[key]}</span>
                    </label>`).join('')}
            </div>
        </div>`).join('');
}

function saveAnswer(questionIndex, answer) {
    currentExam.answers[questionIndex] = answer;
}

function submitExam() {
    const answeredCount = Object.keys(currentExam.answers).length;
    const totalQuestions = currentExam.questions.length;
    if (answeredCount < totalQuestions && !confirm(`${totalQuestions - answeredCount} soru cevaplanmadı. Yine de bitirmek istiyor musun?`)) {
        return;
    }
    clearInterval(timerInterval);
    calculateAndShowResult();
}

function calculateAndShowResult() {
    let correctCount = 0;
    currentExam.questions.forEach((q, i) => { if (currentExam.answers[i] === q.correctAnswer) correctCount++; });
    
    const score = Math.round((correctCount / currentExam.questions.length) * 100);
    const timeElapsed = Math.floor((Date.now() - examStartTime) / 1000);
    
    results.push({ id: Date.now(), examKey: currentExam.key, score, correctCount, totalQuestions: currentExam.questions.length, timeElapsed, date: new Date().toISOString() });
    saveData();
    updateStats();
    renderResults();
    showAnswersReview();
    
    setTimeout(() => {
        closeExamModal();
        showResultModal(score, correctCount, currentExam.questions.length);
    }, 3000);
}

function showAnswersReview() {
    currentExam.questions.forEach((q, index) => {
        document.querySelectorAll(`input[name="question-${index}"]`).forEach(option => {
            const label = option.parentElement;
            if (option.value === q.correctAnswer) label.classList.add('correct');
            else if (option.value === currentExam.answers[index]) label.classList.add('incorrect');
            option.disabled = true;
        });
    });
    document.getElementById('submitExamBtn').style.display = 'none';
}

function showResultModal(score, correct, total) {
    const emoji = score >= 70 ? '🎉' : score >= 50 ? '👍' : '💪';
    const message = score >= 70 ? 'Harika!' : score >= 50 ? 'İyi!' : 'Daha fazla çalış!';
    
    const resultScore = document.getElementById('resultScore');
    const resultDetails = document.getElementById('resultDetails');
    
    if (resultScore) {
        resultScore.innerHTML = `${emoji} ${score}%`;
    }
    
    if (resultDetails) {
        resultDetails.innerHTML = `
            <div class="result-stats">
                <div>${correct} / ${total} Doğru</div>
                <div>${Math.round((correct / total) * 100)}% Başarı</div>
            </div>
            <div class="result-message">${message} ${emoji}</div>
            <div class="result-actions">
                <button class="btn btn-primary" onclick="closeResultModal(); showPage('exams')">
                    Sınavlara Dön
                </button>
            </div>
        `;
    }
    
    document.getElementById('resultModal').classList.add('active');
}

// Diğer Modal ve Yardımcı Fonksiyonlar
function closeExamModal() {
    document.getElementById('examModal').classList.remove('active');
    clearInterval(timerInterval);
    currentExam = null;
}

function closeResultModal() {
    document.getElementById('resultModal').classList.remove('active');
}

function closeSummaryModal() {
    document.getElementById('summaryModal').classList.remove('active');
}

function renderResults() {
    const container = document.getElementById('resultsContainer');
    if (results.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><p class="empty-text">Henüz sınav çözmedin!</p></div>`;
        return;
    }
    const sortedResults = [...results].sort((a, b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = sortedResults.map(result => {
        const scoreClass = result.score >= 70 ? 'score-high' : result.score >= 50 ? 'score-medium' : 'score-low';
        const date = new Date(result.date).toLocaleDateString('tr-TR');
        const time = new Date(result.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const duration = Math.floor(result.timeElapsed / 60);
        return `
            <div class="result-card">
                <div class="result-info">
                    <h4>${result.examKey}</h4>
                    <div class="result-meta">📅 ${date} ${time} | ⏱️ ${duration} dakika | ✅ ${result.correctCount}/${result.totalQuestions} doğru</div>
                </div>
                <div class="result-score-badge">
                    <div class="score-circle ${scoreClass}">${result.score}%</div>
                </div>
            </div>`;
    }).join('');
}

function exportData() {
    const data = { subjects, lessons, exams, results: [] }; // results'ı boş dizi olarak export et
    const dataBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'data.txt';
    link.click();
    alert('✅ data.txt indirildi! Bu dosyayı public klasörüne koyabilirsin.');
}

function importData() {
    const file = document.getElementById('importFile').files[0];
    if (!file) { 
        alert('Lütfen bir dosya seçin!'); 
        return; 
    }
    
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm('Mevcut veriler silinecek ve yeni veriler yüklenecek. Devam edilsin mi?')) {
                // Reset all data first
                subjects = {};
                lessons = [];
                exams = {};
                results = [];
                
                // Update with new data if available
                if (data.subjects) subjects = data.subjects;
                if (data.lessons) lessons = data.lessons;
                if (data.exams) exams = data.exams;
                if (data.results) results = data.results;
                
                // Save the new data
                saveData();
                
                // Update UI
                updateStats();
                renderLessonsAccordion();
                renderExamsAccordion();
                populateSubjectDropdowns();
                
                showAlert('✅ Veriler başarıyla içe aktarıldı!', 'success');
            }
        } catch (error) {
            console.error('Veri içe aktarılırken hata oluştu:', error);
            alert('❌ Geçersiz JSON dosyası veya veri yapısı hatalı!');
        }
    };
    reader.onerror = () => {
        alert('❌ Dosya okunurken bir hata oluştu!');
    };
    reader.readAsText(file);
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
    if (document.getElementById('pdfModal').classList.contains('active')) {
        if (e.key === 'ArrowLeft') previousPage();
        if (e.key === 'ArrowRight') nextPage();
    }
});

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
        if (e.target === modal) modal.classList.remove('active');
    });
});



// Initialize the unit addition form's subject dropdown
const unitSubjectSelect = document.getElementById('unitSubject');
if (unitSubjectSelect) {
    unitSubjectSelect.innerHTML = '<option value="" disabled selected>Ders seçin...</option>';
    Object.keys(subjects).forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        unitSubjectSelect.appendChild(option);
    });
}





// Konu Özeti modalını aç
function openSummary(lessonId) {
    const lesson = lessons.find(l => l.id === Number(lessonId));
    if (!lesson) {
        alert('Konu bulunamadı!');
        return;
    }

    const titleEl = document.getElementById('summaryTitle');
    const contentEl = document.getElementById('summaryContent');
    const modal = document.getElementById('summaryModal');

    if (titleEl) titleEl.textContent = `📝 ${lesson.title}`;
    // Güvenlik: HTML yerine düz metin basıyoruz (XSS önler, satır sonları korunur)
    if (contentEl) contentEl.textContent = lesson.summary || 'Bu konu için özet bulunamadı.';

    if (modal) modal.classList.add('active');
}

// Örnek veri ekleme fonksiyonu
function addSampleData() {
    // Örnek ders ve ünite ekleme
    subjects['Matematik'] = {
        units: {
            'Ünite 1 - Sayılar': true,
            'Ünite 2 - Cebir': true,
            'Ünite 3 - Geometri': true
        }
    };

    subjects['Türkçe'] = {
        units: {
            'Ünite 1 - Dil Bilgisi': true,
            'Ünite 2 - Edebiyat': true
        }
    };

    // Örnek ders içeriği
    lessons.push(
        {
            id: 1,
            subject: 'Matematik',
            unit: 'Ünite 1 - Sayılar',
            title: 'Doğal Sayılar',
            summary: 'Doğal sayılar 0, 1, 2, 3, ... şeklinde sonsuza kadar devam eden sayılardır.\n\nÖzellikler:\n• Pozitif tam sayılardır\n• Sonsuz sayıda doğal sayı vardır\n• Toplama ve çarpma işlemleri kapalıdır',
            pdfData: null,
            createdAt: new Date().toISOString()
        },
        {
            id: 2,
            subject: 'Türkçe',
            unit: 'Ünite 1 - Dil Bilgisi',
            title: 'İsimler',
            summary: 'İsimler, varlıkları, kavramları karşılayan kelimelerdir.\n\nİsim türleri:\n• Özel isimler (İstanbul, Atatürk)\n• Cins isimler (masa, kitap)\n• Somut isimler (elma, araba)\n• Soyut isimler (sevgi, mutluluk)',
            pdfData: null,
            createdAt: new Date().toISOString()
        }
    );

    // Örnek sınav soruları
    exams['Matematik - Ünite 1 - Sayılar - Deneme Sınavı 1'] = [
        {
            id: 1,
            text: 'Aşağıdaki sayılardan hangisi doğal sayıdır?',
            options: {
                A: '0',
                B: '-5',
                C: '3.14',
                D: '1/2',
                E: '√2'
            },
            correctAnswer: 'A'
        },
        {
            id: 2,
            text: '5 + 3 işleminin sonucu kaçtır?',
            options: {
                A: '6',
                B: '7',
                C: '8',
                D: '9',
                E: '10'
            },
            correctAnswer: 'C'
        }
    ];

    console.log('✅ Örnek veriler eklendi');
}

// Tüm verileri sıfırla fonksiyonu
function resetAllData() {
    if (confirm('Tüm yerel veriler silinecek ve sayfa yenilendiğinde public/data.json\'dan veriler geri yüklenecektir. Emin misiniz?')) {
        localStorage.clear();
        location.reload();
    }
}

// PDF görüntüleme fonksiyonları
let currentPdf = null;
let currentPage = 1;
let totalPages = 0;
let pdfScale = 1.5;

function openPdf(lessonId) {
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson || !lesson.pdfData) {
        alert('Bu ders için PDF bulunamadı!');
        return;
    }

    if (!window.pdfjsLib) {
        alert('PDF görüntüleyici yüklenemedi!');
        return;
    }

    // PDF'ı base64'ten blob'a çevir
    const pdfData = lesson.pdfData;
    const pdfBlob = new Blob([Uint8Array.from(atob(pdfData.split(',')[1]), c => c.charCodeAt(0))], { type: 'application/pdf' });

    // PDF'ı yükle ve göster
    const loadingTask = pdfjsLib.getDocument(URL.createObjectURL(pdfBlob));
    loadingTask.promise.then(pdf => {
        currentPdf = pdf;
        totalPages = pdf.numPages;
        currentPage = 1;
        renderPdfPage();
        document.getElementById('pdfModal').classList.add('active');
        updatePdfControls();
    }).catch(error => {
        console.error('PDF yüklenirken hata:', error);
        alert('PDF yüklenirken bir hata oluştu!');
    });
}

function renderPdfPage() {
    if (!currentPdf) return;

    currentPdf.getPage(currentPage).then(page => {
        const scale = pdfScale;
        const viewport = page.getViewport({ scale });

        const canvas = document.getElementById('pdfCanvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        page.render(renderContext);
    });
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        renderPdfPage();
        updatePdfControls();
    }
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderPdfPage();
        updatePdfControls();
    }
}

function zoomIn() {
    pdfScale += 0.25;
    renderPdfPage();
}

function zoomOut() {
    if (pdfScale > 0.5) {
        pdfScale -= 0.25;
        renderPdfPage();
    }
}

function updatePdfControls() {
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;
    document.getElementById('pdfTitle').textContent = `Konu Anlatımı PDF - Sayfa ${currentPage}/${totalPages}`;
}

function closePdfModal() {
    document.getElementById('pdfModal').classList.remove('active');
    currentPdf = null;
    currentPage = 1;
    totalPages = 0;
}
