document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const errorDiv = document.getElementById("error");
    const submitBtn = e.target.querySelector("button");

    // 1. تحضير الواجهة
    submitBtn.innerText = "⏳ جاري التحقق...";
    submitBtn.disabled = true;
    errorDiv.style.display = "none";

    // 2. الرابط الموحد (تأكد أن CONFIG.API_BASE_URL معرف في ملف config.js)
    const LOGIN_URL = `${CONFIG.API_BASE_URL}/api/login`;

    try {
        // 3. إرسال الطلب للسيرفر
        const response = await fetch(LOGIN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                // لتخطي صفحة تحذير ngrok التي تكسر الـ JSON
                "ngrok-skip-browser-warning": "true",
            },
            body: JSON.stringify({ email, password }),
            // ضروري جداً للسماح للمتصفح باستقبال وتخزين الـ Cookie الخاص بـ Session
            credentials: "include", 
        });

        // 4. التأكد من نوع الرد
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("السيرفر أرسل رداً غير متوقع (HTML بدلاً من JSON). تأكد من تشغيل السيرفر.");
        }

        const data = await response.json();

        if (data.success) {
            console.log("✅ تم تسجيل الدخول بنجاح");
            
            // تخزين بيانات المستخدم للاستخدام السريع (مثل الاسم)
            localStorage.setItem("user", JSON.stringify(data.user));

            // 5. التحويل للوحة التحكم
            // تأكد من أن هذا المسار هو الصحيح لصفحتك على GitHub
            window.location.href = "https://ahmedhm1.github.io/Peeka-book/dashboard.html";
        } else {
            throw new Error(data.message || "البريد أو كلمة المرور غير صحيحة");
        }
    } catch (error) {
        console.error("❌ Login Error:", error);
        
        // عرض الخطأ للمستخدم
        errorDiv.innerText = error.message.includes("Failed to fetch") 
            ? "تعذر الاتصال بالسيرفر. تأكد من تشغيل Ngrok." 
            : error.message;
            
        errorDiv.style.display = "block";
        submitBtn.innerText = "دخول";
        submitBtn.disabled = false;
    }
});