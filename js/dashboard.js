const currentUser = auth.check();
if (currentUser) {
    document.getElementById('userName').innerText = currentUser.email || 'مستخدم';
}

let activeStoryId = null;
let pollingInterval = null;

// --- 1. Tabs Navigation ---
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    if (tabName === 'create') {
        document.getElementById('createTab').classList.add('active');
        document.querySelector('button[onclick="switchTab(\'create\')"]').classList.add('active');
    } else {
        document.getElementById('storiesTab').classList.add('active');
        document.querySelector('button[onclick="switchTab(\'stories\')"]').classList.add('active');
        loadMyStories();
    }
}

// --- 2. Image Upload Preview (مهم جداً: معاينة الصورة) ---
const fileInput = document.getElementById('childImage');
const fileUploadDiv = document.getElementById('fileUpload');

fileUploadDiv.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        // تغيير شكل الـ Div ليوضح أنه تم رفع صورة
        fileUploadDiv.classList.add('has-file');
        fileUploadDiv.innerHTML = `
            <p>✅ تم اختيار: ${file.name}</p>
            <img src="${URL.createObjectURL(file)}" style="max-height: 100px; margin-top: 10px; border-radius: 5px;">
        `;
    }
});

// --- 3. Form Submission (FormData for Image Upload) ---
document.getElementById('createStoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerText = "⏳ جاري رفع الصورة وإنشاء القصة...";

    // نستخدم FormData عشان نبعت ملفات + نصوص
    const formData = new FormData();
    formData.append('userId', currentUser.id);
    formData.append('childName', document.getElementById('childName').value);
    formData.append('age', document.getElementById('childAge').value);
    formData.append('theme', document.getElementById('storyTheme').value);
    formData.append('scenesCount', document.getElementById('numScenes').value);
    
    // إضافة الصورة لو موجودة
    if (fileInput.files[0]) {
        formData.append('image', fileInput.files[0]);
    }

    try {
        // ملاحظة: عند استخدام FormData لا نضع Content-Type header يدوياً
        const response = await fetch(`${CONFIG.API_BASE_URL}/create-story`, {
            method: 'POST',
            body: formData 
        });

        const result = await response.json();

        if (result.success) {
            alert('تم استلام البيانات! جاري توليد القصة الآن...');
            activeStoryId = result.storyId;
            switchTab('stories');
            
            // إعادة تعيين الفورم
            document.getElementById('createStoryForm').reset();
            fileUploadDiv.innerHTML = '<p>📷 اضغط لرفع صورة أو اسحبها هنا</p><small>الحد الأقصى: 5 ميجابايت</small>';
            fileUploadDiv.classList.remove('has-file');
        } else {
            throw new Error(result.message || 'حدث خطأ غير معروف');
        }
    } catch (error) {
        console.error(error);
        alert('فشل: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "🚀 إنشاء القصة";
    }
});

// --- 4. Polling & Display Logic ---
async function loadMyStories() {
    const container = document.getElementById('storiesContainer');
    if (activeStoryId) {
        startLivePolling(activeStoryId);
    } else {
        container.innerHTML = '<div style="text-align:center; padding:2rem; color:#666;"><h3>لا توجد قصص قيد المعالجة حالياً</h3><p>ارجع لتبويب "إنشاء قصة" للبدء.</p></div>';
    }
}

function startLivePolling(storyId) {
    const container = document.getElementById('storiesContainer');
    if (pollingInterval) clearInterval(pollingInterval);

    const fetchStatus = async () => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/story/${storyId}`);
            if (!response.ok) throw new Error("Network response was not ok");
            
            const data = await response.json();
            renderScenes(data.scenes, container);

            // التحقق من انتهاء جميع المشاهد
            const allDone = data.scenes.length > 0 && data.scenes.every(s => s.status === 'done');
            if (allDone) {
                clearInterval(pollingInterval);
                // إضافة زر تحميل PDF مثلاً
                if (!document.getElementById('completeMsg')) {
                    const msg = document.createElement('div');
                    msg.id = 'completeMsg';
                    msg.innerHTML = '<h3 style="color:#27ae60; text-align:center; margin:20px; background:#e8f8f5; padding:1rem; border-radius:10px;">🎉 اكتملت القصة بنجاح!</h3>';
                    container.prepend(msg);
                }
            }
        } catch (error) {
            console.error("Polling Error:", error);
        }
    };

    // تشغيل فوري
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري الاتصال بالرسام الآلي...</p></div>';
    fetchStatus();
    pollingInterval = setInterval(fetchStatus, 5000); // كل 5 ثواني
}

function renderScenes(scenes, container) {
    if (!scenes || scenes.length === 0) return;
    
    // الحفاظ على الرسالة العلوية لو موجودة
    const headerMsg = document.getElementById('completeMsg');
    let html = headerMsg ? headerMsg.outerHTML : '';
    
    html += '<div class="stories-grid">';
    
    scenes.forEach(scene => {
        let statusBadge, imageContent;

        switch(scene.status) {
            case 'pending':
                statusBadge = '<span class="story-status status-generating" style="background:#eee; color:#555;">⏳ في الطابور</span>';
                imageContent = '<div class="story-preview" style="background:#f0f0f0; color:#999; font-size:0.9rem;">في انتظار المعالجة...</div>';
                break;
            case 'generating':
                statusBadge = '<span class="story-status status-generating">🎨 جاري الرسم...</span>';
                imageContent = '<div class="story-preview"><div class="spinner" style="width:30px; height:30px; border-width:3px;"></div></div>';
                break;
            case 'done':
                statusBadge = '<span class="story-status status-completed">✅ جاهز</span>';
                // تأكد أن الرابط يعمل (أحياناً ngrok يحتاج مسار كامل)
                imageContent = `<img src="${scene.image_url}" alt="Scene ${scene.scene_number}" onclick="window.open(this.src)" style="cursor:zoom-in;">`;
                break;
            default:
                statusBadge = '<span class="story-status" style="background:#fce4ec; color:#c0392b;">❌ فشل</span>';
                imageContent = '<div class="story-preview" style="background:#fff0f3; color:#c0392b;">تعذر التوليد</div>';
        }

        html += `
            <div class="story-card">
                <div style="height:200px; overflow:hidden;">${imageContent}</div>
                <div class="story-info">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4>مشهد ${scene.scene_number}</h4>
                        ${statusBadge}
                    </div>
                    <p style="font-size:0.9rem; color:#555; margin-top:0.5rem; max-height:80px; overflow-y:auto;">
                        ${scene.scene_text}
                    </p>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}