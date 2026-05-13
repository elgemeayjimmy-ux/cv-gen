// --- [0] إعدادات قاعدة البيانات (Firebase Setup) ---
const firebaseConfig = {
    apiKey: "AIzaSyAoaACXx4HXQ4RLodxf96LU77F73X6ZIvA",
    authDomain: "cv-gen-workspace.firebaseapp.com",
    databaseURL: "https://cv-gen-workspace-default-rtdb.firebaseio.com",
    projectId: "cv-gen-workspace",
    storageBucket: "cv-gen-workspace.firebasestorage.app",
    messagingSenderId: "164430613078",
    appId: "1:164430613078:web:ded480a22be875b92689f7",
    measurementId: "G-NLP20NPSGR"
};

// تهيئة السيرفر ونظام الحسابات
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    var database = firebase.database();
    var auth = firebase.auth(); 
}

let currentUser = ""; 
let currentRoom = null;

// --- [0.5] نظام الحسابات والبروفايل (Authentication & Profile) ---
if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged((user) => {
        const authModal = document.getElementById('authModal');
        if (user) {
            if(authModal) authModal.style.display = "none";
            currentUser = user.displayName || user.email.split('@')[0]; 
            
            if(document.getElementById("currentUserDisp")) document.getElementById("currentUserDisp").innerText = currentUser;
            if(document.getElementById("profileBtnName")) document.getElementById("profileBtnName").innerText = currentUser;
            
            if(document.getElementById("authUI")) document.getElementById("authUI").style.display = "none";
            if(document.getElementById("roomUI")) document.getElementById("roomUI").style.display = "block";

            // جلب البيانات الخاصة بالحساب من الكلاود
            loadUserPersonalData(user.uid);

        } else {
            if(authModal) authModal.style.display = "flex";
        }
    });
}

function registerUser() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const errorMsg = document.getElementById('authError');
    if(!email || !password) return errorMsg.innerText = "Please enter email and password";
    if(password.length < 6) return errorMsg.innerText = "Password must be at least 6 characters";
    
    errorMsg.innerText = "Creating account... ⏳";
    auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
        alert("Account Created Successfully! 🎉");
        document.getElementById('authEmail').value = "";
        document.getElementById('authPassword').value = "";
        errorMsg.innerText = "";
    }).catch((error) => { errorMsg.innerText = error.message; });
}

function loginUser() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const errorMsg = document.getElementById('authError');
    if(!email || !password) return errorMsg.innerText = "Please enter email and password";
    
    errorMsg.innerText = "Logging in... ⏳";
    auth.signInWithEmailAndPassword(email, password)
    .then(() => { errorMsg.innerText = ""; })
    .catch(() => { errorMsg.innerText = "Invalid Email or Password!"; });
}

function logoutUser() {
    if(confirm("Are you sure you want to log out?")) {
        // مسح الذاكرة المحلية لضمان عدم ظهور بياناتك لأي شخص آخر
        localStorage.clear(); 
        auth.signOut().then(() => { location.reload(); });
    }
}

function updateNickname() {
    const newName = document.getElementById('newNickname').value;
    const btn = document.getElementById('updateNameBtn');
    if(!newName) return alert("Please enter a new nickname!");
    
    btn.innerText = "Updating... ⏳";
    const user = auth.currentUser;
    if(user) {
        user.updateProfile({ displayName: newName }).then(() => {
            alert("Nickname updated successfully! 🎉");
            currentUser = newName;
            
            if(document.getElementById("currentUserDisp")) document.getElementById("currentUserDisp").innerText = currentUser;
            if(document.getElementById("profileBtnName")) document.getElementById("profileBtnName").innerText = currentUser;
            
            closeProfileModal();
            btn.innerText = "Save Nickname";
        }).catch((error) => {
            alert("Error: " + error.message);
            btn.innerText = "Save Nickname";
        });
    }
}

function openProfileModal() {
    document.getElementById('profileModal').style.display = "flex";
    document.getElementById('newNickname').value = currentUser;
}

function closeProfileModal() {
    document.getElementById('profileModal').style.display = "none";
}

// --- [0.6] نظام التخزين السحابي الخاص بكل حساب (Cloud Personal Storage) ---
function loadUserPersonalData(uid) {
    if(typeof database === 'undefined') return;
    
    // جلب بيانات الـ CV
    database.ref('users/' + uid + '/cvData').once('value').then((snapshot) => {
        const data = snapshot.val();
        if(data) {
            inputsArr.forEach(id => {
                if(data[id] !== undefined) {
                    const el = document.getElementById(id);
                    if(el) {
                        el.value = data[id];
                        localStorage.setItem(id, data[id]);
                    }
                }
            });
            if(data.profileImage) localStorage.setItem("profileImage", data.profileImage);
            generateCV();
        } else {
            // لو حساب جديد، نفضي الخانات تماماً
            inputsArr.forEach(id => {
                const el = document.getElementById(id);
                if(el) el.value = "";
            });
            localStorage.removeItem("profileImage");
            generateCV();
        }
    });

    // جلب بيانات البورتفوليو
    database.ref('users/' + uid + '/portfolio').once('value').then((snapshot) => {
        const data = snapshot.val();
        if(data) {
            projectsData = data;
            localStorage.setItem('myPortfolio', JSON.stringify(projectsData));
        } else {
            projectsData = [];
            localStorage.removeItem('myPortfolio');
        }
        renderPortfolio();
    });
}

function savePersonalDataToCloud() {
    const user = auth?.currentUser;
    if(!user || typeof database === 'undefined') return;
    
    const d = {};
    inputsArr.forEach(id => {
        let el = document.getElementById(id);
        if(el) d[id] = el.value;
    });
    d.profileImage = localStorage.getItem("profileImage") || "";
    
    // حفظ البيانات في السيرفر تحت كود اليوزر
    database.ref('users/' + user.uid + '/cvData').set(d);
}

function syncPortfolioToCloud() {
    const user = auth?.currentUser;
    if(user && typeof database !== 'undefined') {
        database.ref('users/' + user.uid + '/portfolio').set(projectsData);
    }
}

// --- [1] إعدادات النظام والمزامنة ---
const inputsArr = ["name", "title", "email", "phone", "linkedin", "about", "experience", "education", "projectsText", "certifications", "skills"];

window.onload = () => {
    try {
        inputsArr.forEach(id => {
            let el = document.getElementById(id);
            if(el) {
                if (localStorage.getItem(id)) el.value = localStorage.getItem(id);
                el.addEventListener("input", () => {
                    localStorage.setItem(id, el.value);
                    generateCV();
                    if(typeof syncDataToFirebase === "function") syncDataToFirebase();
                    savePersonalDataToCloud(); // رفع التعديل للكلاود فوراً
                });
            }
        });
    } catch(e) { console.error("Error loading inputs:", e); }

    try {
        if(localStorage.getItem('theme') === 'dark') {
            let htmlTag = document.getElementById('html-tag') || document.documentElement;
            htmlTag.setAttribute('data-theme', 'dark');
            let icon = document.getElementById('darkModeIcon');
            if(icon) icon.classList.replace('fa-moon', 'fa-sun');
        }
    } catch(e) { console.error("Error loading theme:", e); }

    if(typeof renderPortfolio === "function") renderPortfolio();
    generateCV(); 
};

// --- [2] التحكم في الواجهة ---
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

function switchTab(tabId, btn) {
    document.querySelectorAll('.app-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));

    const target = document.getElementById(tabId);
    if(target) target.classList.add('active');
    if(btn) btn.classList.add('active');
}

function toggleDarkMode() {
    const htmlTag = document.getElementById('html-tag');
    const icon = document.getElementById('darkModeIcon');
    
    if (htmlTag.getAttribute('data-theme') === 'light' || !htmlTag.getAttribute('data-theme')) {
        htmlTag.setAttribute('data-theme', 'dark');
        if(icon) icon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        htmlTag.setAttribute('data-theme', 'light');
        if(icon) icon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'light');
    }
}

// --- [3] محرك القوالب (CV Core Engine) ---
function generateCV() {
    const d = {};
    inputsArr.forEach(id => {
        let el = document.getElementById(id);
        d[id] = el ? el.value : "";
    });
    const langElement = document.getElementById("langToggle");
    const typeElement = document.getElementById("cvType");
    
    const lang = langElement ? langElement.value : "en";
    const type = typeElement ? typeElement.value : "modern";
    const img = localStorage.getItem("profileImage") || "";

    let skillsHTML = "";
    if (d.skills) {
        d.skills.split(",").forEach(s => {
            let p = s.split("-");
            skillsHTML += `
            <div style="margin-bottom:12px;">
                <p style="font-size:11px; margin-bottom:4px; font-weight:bold;">${p[0].trim()}</p>
                <div style="width:100%; height:5px; background:#e2e8f0; border-radius:10px;">
                    <div style="width:${p[1]||80}%; height:100%; background:var(--accent);"></div>
                </div>
            </div>`;
        });
    }

    let finalLayout = "";

    if (type === "ats") {
        finalLayout = `
        <div style="width:100%; padding:50px; background:white; color:#000; ${lang === 'ar' ? 'direction:rtl;' : ''}">
            <h1 style="text-align:center; border-bottom:2px solid #000; font-size:28px;">${d.name || 'YOUR NAME'}</h1>
            <p style="text-align:center; font-weight:bold; margin-top:5px;">${d.title}</p>
            <p style="text-align:center; font-size:12px;">${d.email} | ${d.phone} | ${d.linkedin}</p>
            <div style="margin-top:20px;">
                <h3 style="border-bottom:1px solid #000; font-size:16px;">Professional Summary</h3>
                <p style="margin-top:5px; line-height:1.6;">${d.about}</p>
            </div>
            <div style="margin-top:15px;">
                <h3 style="border-bottom:1px solid #000; font-size:16px;">Work Experience</h3>
                <p style="margin-top:5px; white-space:pre-line; line-height:1.6;">${d.experience}</p>
            </div>
            ${d.education ? `<div style="margin-top:15px;"><h3 style="border-bottom:1px solid #000; font-size:16px;">Education</h3><p style="margin-top:5px; white-space:pre-line; line-height:1.6;">${d.education}</p></div>` : ''}
            ${d.projectsText ? `<div style="margin-top:15px;"><h3 style="border-bottom:1px solid #000; font-size:16px;">Projects</h3><p style="margin-top:5px; white-space:pre-line; line-height:1.6;">${d.projectsText}</p></div>` : ''}
            ${d.certifications ? `<div style="margin-top:15px;"><h3 style="border-bottom:1px solid #000; font-size:16px;">Certifications</h3><p style="margin-top:5px; white-space:pre-line; line-height:1.6;">${d.certifications}</p></div>` : ''}
            <div style="margin-top:15px;">
                <h3 style="border-bottom:1px solid #000; font-size:16px;">Skills</h3>
                <p style="margin-top:5px;">${d.skills}</p>
            </div>
        </div>`;
    } 
    else {
        finalLayout = `
        <div style="display:flex; min-height:297mm; ${lang === 'ar' ? 'direction:rtl;' : ''}">
            <div style="width:35%; background:#111827; color:white; padding:40px 20px; text-align:center;">
                ${img ? `<img src="${img}" style="width:120px; height:120px; border-radius:50%; border:3px solid var(--accent); object-fit:cover; margin-bottom:20px;">` : ""}
                <h2 style="font-size:20px; margin-bottom:5px;">${d.name || 'YOUR NAME'}</h2>
                <p style="color:var(--accent); font-size:12px; font-weight:bold;">${d.title}</p>
                <div style="margin-top:35px; text-align:left;">
                    <h3 style="font-size:14px; border-bottom:1px solid #333; padding-bottom:5px; margin-bottom:10px;">Contact</h3>
                    <p style="font-size:11px; margin-bottom:5px;"><i class="fas fa-envelope"></i> ${d.email}</p>
                    <p style="font-size:11px; margin-bottom:5px;"><i class="fas fa-phone"></i> ${d.phone}</p>
                    ${d.education ? `<h3 style="font-size:14px; border-bottom:1px solid #333; padding-bottom:5px; margin-top:20px; margin-bottom:10px;">Education</h3><p style="font-size:11px; white-space:pre-line;">${d.education}</p>` : ''}
                    <h3 style="font-size:14px; border-bottom:1px solid #333; padding-bottom:5px; margin-top:20px; margin-bottom:10px;">Skills</h3>
                    ${skillsHTML}
                </div>
            </div>
            <div style="width:65%; padding:50px; background:white; color:#333;">
                <h2 style="border-bottom:2px solid var(--accent); padding-bottom:8px; color:#111;">Profile</h2>
                <p style="margin-top:15px; line-height:1.7; font-size:13px;">${d.about}</p>
                <h2 style="border-bottom:2px solid var(--accent); padding-bottom:8px; margin-top:30px; color:#111;">Experience</h2>
                <p style="margin-top:15px; white-space:pre-line; line-height:1.7; font-size:13px;">${d.experience}</p>
                ${d.projectsText ? `<h2 style="border-bottom:2px solid var(--accent); padding-bottom:8px; margin-top:30px; color:#111;">Projects</h2><p style="margin-top:15px; white-space:pre-line; line-height:1.7; font-size:13px;">${d.projectsText}</p>` : ''}
            </div>
        </div>`;
    }

    const cvResult = document.getElementById("cvResult");
    if(cvResult) cvResult.innerHTML = finalLayout;
}

// --- [4] محرك البورتفوليو ---
let projectsData = JSON.parse(localStorage.getItem('myPortfolio')) || [];

function addPortfolioItem() {
    const title = document.getElementById("portTitle").value;
    const desc = document.getElementById("portDesc").value;
    const fileInput = document.getElementById("portImage");

    if(!title || !fileInput.files[0]) {
        alert("Please add a title and an image!");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 500;
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedImage = canvas.toDataURL("image/jpeg", 0.6);

            projectsData.push({ title: title, desc: desc, img: compressedImage });
            
            try {
                localStorage.setItem('myPortfolio', JSON.stringify(projectsData));
                syncPortfolioToCloud(); // رفع المحفظة للكلاود
                document.getElementById("portTitle").value = "";
                document.getElementById("portDesc").value = "";
                fileInput.value = "";
                renderPortfolio();
            } catch (error) {
                alert("الذاكرة ممتلئة! يرجى مسح بعض المشاريع القديمة.");
                projectsData.pop();
            }
        }
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function renderPortfolio() {
    const grid = document.getElementById("portfolioGrid");
    if(!grid) return;
    grid.innerHTML = "";
    projectsData.forEach((proj, index) => {
        grid.innerHTML += `
        <div class="portfolio-card">
            <img src="${proj.img}" alt="Project">
            <div class="portfolio-card-content">
                <h3>${proj.title}</h3>
                <p>${proj.desc}</p>
                <button onclick="deletePortfolio(${index})" style="background:none; border:none; color:red; cursor:pointer; margin-top:10px; font-size:12px;">Delete</button>
            </div>
        </div>`;
    });
}

function deletePortfolio(index) {
    projectsData.splice(index, 1);
    localStorage.setItem('myPortfolio', JSON.stringify(projectsData));
    syncPortfolioToCloud(); // تحديث الحذف في الكلاود
    renderPortfolio();
}

// --- [5] محرك الذكاء الاصطناعي (Gemini API) ---
const GEMINI_API_KEY = "AIzaSyC7jzoBsgfIckzLDD_iddXGHWC7Yq8DGzM"; 

async function fetchRealAI(promptText) {
    if(!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY_HERE") {
        return "⚠️ Please add your API Key in the code.";
    }
    
    let modelToUse = "";
    try {
        const modelsReq = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
        const modelsData = await modelsReq.json();
        if (modelsData.models) {
            const validModels = modelsData.models.filter(m => 
                m.supportedGenerationMethods && 
                m.supportedGenerationMethods.includes("generateContent") && 
                m.name.includes("gemini")
            );
            if (validModels.length > 0) {
                const flashModel = validModels.find(m => m.name.includes("flash"));
                modelToUse = flashModel ? flashModel.name : validModels[0].name;
            } else return "⚠️ المفتاح سليم ولكن لا يمتلك صلاحية الذكاء الاصطناعي.";
        } else if (modelsData.error) return `⚠️ خطأ: ${modelsData.error.message}`;
    } catch (e) {
        return "⚠️ فشل الاتصال بخوادم جوجل.";
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelToUse}:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });
        const data = await response.json();
        if (response.ok) return data.candidates[0].content.parts[0].text;
        else return `API Error: ${data.error?.message || 'تم رفض الطلب'}`;
    } catch (error) { return "خطأ في الاتصال بالإنترنت."; }
}

async function aiGenerateAboutMe() {
    const job = document.getElementById("title").value || "Professional";
    const skills = document.getElementById("skills").value || "";
    const experience = document.getElementById("experience").value || "";
    
    const aboutBox = document.getElementById("about");
    aboutBox.value = "AI is thinking and checking available models... please wait ⏳";
    
    let prompt = `Write a highly personalized, confident, and professional 'About Me' summary for a CV.\nMy current Job Title: ${job}`;
    if (skills) prompt += `\nMy Skills: ${skills}`;
    if (experience) prompt += `\nBrief Experience: ${experience}`;
    prompt += `\nInstructions: Write STRICTLY in the FIRST PERSON. DO NOT use my name. Keep it under 50 words. Provide ONLY the final text.`;
    
    const result = await fetchRealAI(prompt);
    aboutBox.value = result;
    localStorage.setItem("about", result);
    generateCV();
    savePersonalDataToCloud(); // رفع النبذة للكلاود
}

async function aiGenerateArticleReal() {
    const promptInput = document.getElementById("aiDocPrompt").value;
    const canvas = document.getElementById("doc-canvas");
    if(!promptInput) return alert("Please enter a prompt first!");

    canvas.innerHTML = `<h3 style="color:#888;">AI is writing the document... please wait ⏳</h3>`;
    const prompt = `Write a detailed professional article/document about: ${promptInput}. Format it clearly with HTML paragraphs <p> and headers <h3>.`;
    let result = await fetchRealAI(prompt);
    result = result.replace(/```html|```/g, '');
    
    if(currentRoom && typeof database !== 'undefined') {
        database.ref('rooms/' + currentRoom + '/article').set({ content: result });
    } else {
        canvas.innerHTML = result;
    }
}

// --- [6] محرك العروض التقديمية التشاركي ---
let pptSlides = [];

function addSlidePreview() {
    const title = document.getElementById("slideTitle").value;
    const content = document.getElementById("slideContent").value;
    if(!title) return alert("Enter slide title!");

    const slideData = { title, content };

    if (currentRoom && typeof database !== 'undefined') {
        database.ref('rooms/' + currentRoom + '/slides').push(slideData);
    } else {
        pptSlides.push(slideData);
        renderSingleSlide(slideData);
    }
    
    document.getElementById("slideTitle").value = "";
    document.getElementById("slideContent").value = "";
}

function renderSingleSlide(s) {
    const list = document.getElementById("slidesPreviewList");
    if(list) {
        list.innerHTML += `
        <div style="background:var(--bg-main); padding:15px; border-radius:8px; border:1px solid var(--border-color); margin-bottom:10px;">
            <h4 style="color:var(--accent);">${s.title}</h4>
            <p style="font-size:12px; color:var(--text-muted); margin-top:5px;">${s.content}</p>
        </div>`;
    }
}

function exportPPTX() {
    if(pptSlides.length === 0) return alert("Add some slides first!");
    
    let pres = new PptxGenJS(); 
    let slideTitle = pres.addSlide();
    slideTitle.addText("Team Presentation", { x:1.5, y:1.5, fontSize:36, color:"363636", bold:true });
    slideTitle.addText("Collaboratively generated on CV-GEN Workspace", { x:1.5, y:2.5, fontSize:18, color:"666666" });

    pptSlides.forEach(s => {
        let slide = pres.addSlide();
        slide.addText(s.title, { x:0.5, y:0.5, fontSize:24, color:"00e5ff", bold:true });
        slide.addText(s.content, { x:0.5, y:1.5, fontSize:16, color:"363636", bullet:true });
    });

    pres.writeFile({ fileName: "Team_Presentation.pptx" });
}

// --- [7] محرك اختبار الإنجليزي ---
const englishQuestions = [
    { q: "I ___ a student.", options: ["am", "is", "are", "be"], ans: 0 },
    { q: "She ___ to the park every day.", options: ["go", "goes", "going", "went"], ans: 1 },
    { q: "___ you like coffee?", options: ["Do", "Does", "Are", "Is"], ans: 0 },
    { q: "Where ___ they from?", options: ["am", "is", "are", "do"], ans: 2 },
    { q: "He ___ got a new car.", options: ["have", "has", "is", "doing"], ans: 1 },
    { q: "I can't see ___ books on the table.", options: ["some", "any", "no", "a"], ans: 1 },
    { q: "This is ___ apple.", options: ["a", "an", "the", "some"], ans: 1 },
    { q: "My brother ___ 20 years old.", options: ["has", "is", "have", "are"], ans: 1 },
    { q: "___ is your name?", options: ["Who", "How", "What", "When"], ans: 2 },
    { q: "I get up ___ 7 o'clock.", options: ["in", "on", "at", "to"], ans: 2 },
    { q: "I ___ playing football yesterday.", options: ["am", "was", "were", "be"], ans: 1 },
    { q: "We didn't ___ to the cinema.", options: ["go", "went", "going", "goes"], ans: 0 },
    { q: "She is ___ than her sister.", options: ["tall", "taller", "tallest", "more tall"], ans: 1 },
    { q: "Have you ever ___ to Paris?", options: ["be", "been", "went", "go"], ans: 1 },
    { q: "I am going to ___ my friend tomorrow.", options: ["visiting", "visit", "visited", "visits"], ans: 1 },
    { q: "There are ___ people in the room.", options: ["much", "many", "a lot", "any"], ans: 1 },
    { q: "You ___ smoke in the hospital.", options: ["mustn't", "don't have to", "needn't", "should"], ans: 0 },
    { q: "If it rains, we ___ at home.", options: ["stay", "will stay", "stayed", "would stay"], ans: 1 },
    { q: "I enjoy ___ books in my free time.", options: ["read", "reading", "to read", "reads"], ans: 1 },
    { q: "He works ___ a bank.", options: ["in", "on", "at", "by"], ans: 0 },
    { q: "The car, ___ was blue, crashed.", options: ["who", "which", "where", "what"], ans: 1 },
    { q: "By the time I arrived, they ___ left.", options: ["have", "has", "had", "were"], ans: 2 },
    { q: "I am used to ___ early.", options: ["wake up", "waking up", "woke up", "woken up"], ans: 1 },
    { q: "She told me she ___ call me later.", options: ["will", "would", "can", "shall"], ans: 1 },
    { q: "Unless you ___, you will fail.", options: ["study", "don't study", "studied", "will study"], ans: 0 },
    { q: "Not only ___ late, but he also forgot the report.", options: ["he was", "was he", "is he", "he is"], ans: 1 },
    { q: "I'd rather you ___ here.", options: ["don't smoke", "didn't smoke", "not smoke", "won't smoke"], ans: 1 },
    { q: "It's high time you ___ a job.", options: ["get", "got", "getting", "have got"], ans: 1 },
    { q: "He was ___ tired that he fell asleep immediately.", options: ["so", "such", "very", "too"], ans: 0 },
    { q: "Had I known, I ___ helped you.", options: ["would", "will have", "would have", "had"], ans: 2 }
];

let currentQ = 0;
let score = 0;

function startEnglishTest() {
    document.getElementById("introTest").style.display = "none";
    document.getElementById("quizArea").style.display = "block";
    currentQ = 0;
    score = 0;
    loadQuestion();
}

function loadQuestion() {
    const qData = englishQuestions[currentQ];
    document.getElementById("questionText").innerText = `${currentQ + 1}. ${qData.q}`;
    document.getElementById("questionCount").innerText = `Question ${currentQ + 1} of ${englishQuestions.length}`;
    
    let optionsHtml = "";
    qData.options.forEach((opt, idx) => {
        optionsHtml += `<div class="test-option" onclick="selectOption(this, ${idx})">${opt}</div>`;
    });
    document.getElementById("optionsArea").innerHTML = optionsHtml;
}

let selectedAnswer = -1;
function selectOption(element, idx) {
    document.querySelectorAll(".test-option").forEach(el => el.classList.remove("selected"));
    element.classList.add("selected");
    selectedAnswer = idx;
}

function nextQuestion() {
    if (selectedAnswer === -1) return alert("Please select an answer!");
    if (selectedAnswer === englishQuestions[currentQ].ans) score++;
    
    currentQ++;
    selectedAnswer = -1;
    
    if (currentQ < englishQuestions.length) {
        loadQuestion();
    } else {
        showTestResult();
    }
}

function showTestResult() {
    document.getElementById("quizArea").style.display = "none";
    document.getElementById("resultArea").style.display = "block";
    document.getElementById("scoreDisplay").innerText = `${score} / ${englishQuestions.length}`;
    
    let level = "Beginner (A1)";
    if(score > 6) level = "Elementary (A2)";
    if(score > 14) level = "Intermediate (B1)";
    if(score > 21) level = "Upper Intermediate (B2)";
    if(score > 26) level = "Advanced (C1)";

    document.getElementById("levelDisplay").innerText = `Estimated Level: ${level}`;
}

function resetTest() {
    document.getElementById("resultArea").style.display = "none";
    document.getElementById("introTest").style.display = "block";
}

// --- [8] محرك الوظائف ---
function openJobPortal() {
    const jobTitle = document.getElementById("title") ? document.getElementById("title").value : "Developer";
    const jobTitleDisplay = document.getElementById("searchJobTitle");
    if(jobTitleDisplay) jobTitleDisplay.innerText = jobTitle || "Developer";
    
    const modal = document.getElementById("jobPortalModal");
    if(modal) modal.style.display = "flex";
}

function closeJobPortal() {
    const modal = document.getElementById("jobPortalModal");
    if(modal) modal.style.display = "none";
}

function executeSearch(platform) {
    const jobTitle = document.getElementById("title") ? document.getElementById("title").value : "Developer";
    let url = "";
    
    if(platform === 'linkedin') {
        url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(jobTitle)}`;
    } else if(platform === 'wuzzuf') {
        url = `https://wuzzuf.net/search/jobs/?q=${encodeURIComponent(jobTitle)}`;
    } else if(platform === 'indeed') {
        url = `https://eg.indeed.com/jobs?q=${encodeURIComponent(jobTitle)}`;
    }
    
    window.open(url, '_blank');
}

window.runSmartJobMatch = async function() {
    try {
        const resultDiv = document.getElementById("aiMatchResults");
        const btn = document.querySelector("button[onclick='runSmartJobMatch()']");
        
        if(!resultDiv) return;

        const title = document.getElementById("title") ? document.getElementById("title").value : "Professional";
        const skills = document.getElementById("skills") ? document.getElementById("skills").value : "";
        const experience = document.getElementById("experience") ? document.getElementById("experience").value : "";
        
        if (!skills && !experience) return alert("يرجى إضافة بعض المهارات أو الخبرة في الـ CV أولاً!");

        if(btn) {
            btn.innerText = "Analyzing CV... ⏳";
            btn.disabled = true;
        }
        resultDiv.style.display = "block";
        resultDiv.innerHTML = "<p style='text-align:center; color:#888;'>Reading your profile and scanning the market...</p>";

        const prompt = `Act as an expert Tech Recruiter. Analyze this candidate's profile:
        Job Title: ${title}\nSkills: ${skills}\nExperience: ${experience}
        Based on this, suggest the top 3 best-fitting job titles in the current market. 
        Format EXACTLY like this HTML:
        <ul style='list-style:none; padding:0;'><li style='margin-bottom:10px;'><b>1. [Job Title]</b> <span style='color:green;'>(XX% Match)</span><br><span style='color:#666; font-size:11px;'>Why: [1 short sentence]</span></li></ul>`;

        let result = await fetchRealAI(prompt);
        result = result.replace(/```html|```/g, '');
        resultDiv.innerHTML = result;
        
        if(btn) {
            btn.innerText = "Analyze My CV & Find Matches";
            btn.disabled = false;
        }
    } catch (error) { console.error(error); }
};

// --- [9] أدوات مساعدة إضافية ---
function downloadPDF() {
    const element = document.getElementById("cvResult");
    
    const opt = {
        margin:       0,
        filename:     'My_Professional_CV.pdf',
        image:        { type: 'jpeg', quality: 1 }, 
        html2canvas:  { scale: 2, useCORS: true }, 
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    element.style.zoom = "1";
    element.style.boxShadow = "none"; 
    element.style.height = "297mm"; 
    element.style.overflow = "hidden"; 

    html2pdf().set(opt).from(element).save().then(() => {
        element.style.zoom = "0.65";
        element.style.boxShadow = "var(--glass-shadow)";
        element.style.height = "auto";
        element.style.overflow = "visible";
    });
}

function toggleLanguage() {
    const lang = document.getElementById("langToggle").value;
    document.getElementById("html-tag").dir = (lang === 'ar' ? 'rtl' : 'ltr');
    generateCV();
}

document.getElementById("imageInput")?.addEventListener("change", (e) => {
    const reader = new FileReader();
    reader.onload = (f) => {
        localStorage.setItem("profileImage", f.target.result);
        generateCV();
        savePersonalDataToCloud(); 
    };
    if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
});

function resetForm() {
    if(confirm("Are you sure? This will delete all saved data.")) {
        localStorage.clear();
        location.reload();
    }
}

// --- [10] محرك Team Mode اللحظي الشامل ---
function loginTeam() {
    const user = document.getElementById("teamUsername").value;
    if(!user) return alert("Enter a username!");
    currentUser = user;
    document.getElementById("authUI").style.display = "none";
    document.getElementById("roomUI").style.display = "block";
    document.getElementById("currentUserDisp").innerText = currentUser;
}

function createRoom() {
    if(typeof database === 'undefined') return alert("تأكد من إضافة مكتبات فايربيز!");
    
    const roomId = Math.floor(1000 + Math.random() * 9000).toString();
    currentRoom = roomId;
    
    database.ref('rooms/' + roomId + '/members/' + currentUser).set({ role: "Admin (Creator)" });
    setupRoomUI(roomId, "Admin (Creator)");
    listenToRoomSync();
    alert(`Room created! Share ID: ${roomId} with your team.`);
}

function joinRoomPrompt() {
    if(typeof database === 'undefined') return alert("تأكد من إضافة مكتبات فايربيز!");
    
    const roomId = prompt("Enter Room ID:");
    if(!roomId) return;
    currentRoom = roomId;

    database.ref('rooms/' + roomId + '/members/' + currentUser).set({ role: "Member" });
    setupRoomUI(roomId, "Member");
    listenToRoomSync();
}

function setupRoomUI(roomId, role) {
    document.getElementById("activeRoomArea").style.display = "block";
    document.getElementById("roomIdDisp").innerText = roomId;
    document.getElementById("roleDisp").innerText = role;
}

function listenToRoomSync() {
    if(!currentRoom || typeof database === 'undefined') return;

    database.ref('rooms/' + currentRoom + '/members').on('value', (snapshot) => {
        const members = snapshot.val();
        let listHTML = "";
        for(let name in members) {
            let icon = members[name].role.includes("Admin") ? "👑" : "👤";
            let you = name === currentUser ? " (You)" : "";
            listHTML += `<li style="background:rgba(255,255,255,0.1); padding:8px; border-radius:4px; margin-bottom:5px;">${icon} ${name} ${you}</li>`;
        }
        document.getElementById("teamList").innerHTML = listHTML;
    });

    database.ref('rooms/' + currentRoom + '/cvData').on('value', (snapshot) => {
        const data = snapshot.val();
        if(data && data.updatedBy !== currentUser) {
            inputsArr.forEach(id => {
                if(data[id] !== undefined) {
                    const el = document.getElementById(id);
                    if(el && el.value !== data[id]) {
                        el.value = data[id];
                        localStorage.setItem(id, data[id]);
                    }
                }
            });
            generateCV();
        }
    });

    database.ref('rooms/' + currentRoom + '/slides').on('value', (snapshot) => {
        const slidesData = snapshot.val();
        pptSlides = []; 
        const list = document.getElementById("slidesPreviewList");
        if(list) list.innerHTML = ""; 
        
        if(slidesData) {
            for(let key in slidesData) {
                pptSlides.push(slidesData[key]);
                renderSingleSlide(slidesData[key]);
            }
        }
    });

    database.ref('rooms/' + currentRoom + '/article').on('value', (snapshot) => {
        const data = snapshot.val();
        if(data && data.content) {
            const canvas = document.getElementById("doc-canvas");
            if(canvas) canvas.innerHTML = data.content;
        }
    });
}

function syncDataToFirebase() {
    if(!currentRoom || typeof database === 'undefined') return;
    let dataToSync = { updatedBy: currentUser };
    inputsArr.forEach(id => {
        const el = document.getElementById(id);
        if(el) dataToSync[id] = el.value;
    });
    database.ref('rooms/' + currentRoom + '/cvData').set(dataToSync);
}
