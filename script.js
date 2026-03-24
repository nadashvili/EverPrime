import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, addDoc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getDatabase, ref, set, onDisconnect } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAtQfNnv6qDbnbHzZ-XE8pIylLRYg5UTbg",
    authDomain: "everprime-b80dd.firebaseapp.com",
    projectId: "everprime-b80dd",
    storageBucket: "everprime-b80dd.firebasestorage.app",
    messagingSenderId: "527537324294",
    appId: "1:527537324294:web:de1a4e25057389bc6e9e87",
    databaseURL: "https://everprime-b80dd-default-rtdb.europe-west1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

let allProducts = [];
let currentPage = 1;

// --- შეტყობინებების ფანჯარა ---
window.primeShow = (text, confirmMode = false, onConfirm = null) => {
    const modal = document.getElementById('prime-popup');
    const txt = document.getElementById('popup-text');
    const confirmBtn = document.getElementById('popup-confirm');
    const closeBtn = document.getElementById('popup-close');
    if(!modal) return;
    txt.innerText = text;
    modal.classList.replace('hidden', 'flex');
    if (confirmMode) {
        confirmBtn.classList.remove('hidden');
        confirmBtn.onclick = () => { if (onConfirm) onConfirm(); modal.classList.replace('flex', 'hidden'); };
    } else { confirmBtn.classList.add('hidden'); }
    closeBtn.onclick = () => modal.classList.replace('flex', 'hidden');
};

// --- ავტორიზაციის კონტროლი ---
onAuthStateChanged(auth, async (user) => {
    const authSec = document.getElementById('auth-section');
    const main = document.getElementById('main-content');
    const navUser = document.getElementById('nav-user-area');
    if (user) {
        const userStatusRef = ref(rtdb, '/online_users/' + user.uid);
        set(userStatusRef, { email: user.email, last_active: Date.now() });
        onDisconnect(userStatusRef).remove();
        authSec.classList.add('hidden');
        main.classList.remove('hidden');
        navUser.innerHTML = `<button onclick="window.toggleProfile()" class="nav-btn">${user.email.split('@')[0].toUpperCase()}</button>`;
        loadUserProfile(user.uid);
        loadProducts();
    } else {
        authSec.classList.remove('hidden');
        main.classList.add('hidden');
    }
});

// --- პროდუქტების ჩატვირთვა ---
function loadProducts() {
    onSnapshot(collection(db, "products"), (snap) => {
        allProducts = [];
        snap.forEach(d => allProducts.push({ id: d.id, ...d.data() }));
        window.filterProducts();
    });
}

// --- დეტალური ხედვა ---
window.showDetails = (id) => {
    const p = allProducts.find(item => item.id === id);
    if(!p) return;
    const modal = document.getElementById('details-modal-overlay');
    const content = document.getElementById('details-content');
    content.innerHTML = `
        <div class="flex flex-col gap-6">
            <div class="w-full flex items-center justify-center bg-black/50 p-4 border border-white/5">
                <img src="${p.image || ''}" class="max-h-56 object-contain shadow-2xl shadow-red-600/20">
            </div>
            <div class="w-full text-left">
                <h2 class="font-sync text-1xl font-black italic uppercase text-red-600 mb-2">${p.name}</h2>
                <div class="text-white font-bold text-lg mb-4 tracking-tighter">${p.price}₾</div>
                <p class="text-gray-400 text-[12px] md:text-xs leading-relaxed uppercase whitespace-pre-line mb-5 bg-white/5 p-3 border-l border-red-600">${p.desc || 'აღწერა არ არის'}</p>
                <div class="flex flex-col gap-3">
                    <button onclick="window.order('${p.id}', '${p.name}'); window.closeDetails()" class="buy-btn">შეკვეთა</button>
                    <button onclick="window.closeDetails()" class="w-full py-2 text-[15px] text-red-500 hover:text-white uppercase font-bold tracking-widest transition">დახურვა</button>
                </div>
            </div>
        </div>`;
    modal.style.display = 'flex';
};

window.closeDetails = () => { document.getElementById('details-modal-overlay').style.display = 'none'; };

// --- ფილტრაცია და ძებნა ---
window.filterProducts = () => {
    const search = document.getElementById('search-input').value.toLowerCase();
    const sort = document.getElementById('sort-select').value;
    const grid = document.getElementById('product-grid');
    let filtered = allProducts.filter(p => p.name.toLowerCase().includes(search));
    
    if(sort === 'low') filtered.sort((a,b) => a.price - b.price);
    if(sort === 'high') filtered.sort((a,b) => b.price - a.price);
    
    const itemsPerPage = window.innerWidth < 768 ? 4 : 16;
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);
    
    grid.innerHTML = '';
    paginated.forEach(p => {
        grid.innerHTML += `
            <div class="product-card group reveal-up">
                <div class="h-55 w-full flex items-center justify-center bg-black/40 mb-6 border border-white/5 overflow-hidden ">
                    <img src="${p.image || ''}" class="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-500">
                </div>
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-sync text-[16px] font-bold uppercase italic">${p.name}</h3>
                    <span class="text-red-600 font-bold tracking-tighter">${p.price}₾</span>
                </div>
                <button onclick="window.showDetails('${p.id}')" class="details-btn">დეტალები</button>
                <button onclick="window.order('${p.id}', '${p.name}')" class="buy-btn">შეკვეთა</button>
            </div>`;
    });
    renderPagination(total);
};

function renderPagination(total) {
    const container = document.getElementById('pagination-bottom');
    if (!container || total <= 1) return;
    container.innerHTML = '';
    for (let i = 1; i <= total; i++) {
        const btnClass = i === currentPage ? 'bg-red-600 text-white' : 'text-gray-500';
        container.innerHTML += `<button onclick="window.goToPage(${i})" class="w-12 h-12 border font-bold transition-all ${btnClass}">${i}</button>`;
    }
}

window.goToPage = (page) => { currentPage = page; window.filterProducts(); document.getElementById('shop').scrollIntoView(); };

// --- პროფილის ჩატვირთვა ---
async function loadUserProfile(uid) {
    const d = await getDoc(doc(db, "users", uid));
    if(d.exists()) {
        document.getElementById('u-phone-upd').value = d.data().phone || '';
        document.getElementById('u-address-upd').value = d.data().address || '';
    }
}

// --- შეკვეთის მთავარი ფუნქცია (Telegram + Firebase) ---
window.order = async (id, name) => {
    const user = auth.currentUser;
    const uDoc = await getDoc(doc(db, "users", user.uid));
    const data = uDoc.data();
    
    if(!data || !data.phone || !data.address) { 
        window.primeShow("შეავსეთ პროფილი (ნომერი და მისამართი)!"); 
        window.toggleProfile(); 
        return; 
    }

    window.primeShow(`ადასტურებთ შეკვეთას: ${name}?`, true, async () => {
        const orderInfo = { 
            product: name, 
            email: user.email, 
            phone: data.phone, 
            address: data.address, 
            time: new Date().toLocaleString('ka-GE'), 
            timestamp: Date.now() 
        };

        try {
            // 1. იწერება FIRESTORE-ში
            await addDoc(collection(db, "orders"), orderInfo);
            
            // 2. იწერება REALTIME DB-ში (ადმინ პანელის განგაშისთვის)
            await set(ref(rtdb, 'orders_live/' + user.uid + '_' + Date.now()), orderInfo);

            // 3. ტელეგრამის შეტყობინება (მუშაობს მაშინაც კი თუ ადმინი ოფლაინშია)
            const botToken = '8023573505:AAFRsExFNpP2d2YpQB4nGDlB-ZEFo3u7wxE';
            const chatId = '-1003731895302';
            const tgText = `🚀 EverPrime: ახალი შეკვეთა!\n\n📦 პროდუქტი: ${orderInfo.product}\n📞 ტელეფონი: ${orderInfo.phone}\n📧 Email: ${orderInfo.email}\n📍 მისამართი: ${orderInfo.address}\n⏰ დრო: ${orderInfo.time}`;
            
            const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(tgText)}`;
            new Image().src = url;

            window.primeShow("შეკვეთა მიღებულია! ოპერატორი დაგიკავშირდებათ.");
        } catch (e) {
            window.primeShow("შეცდომა შეკვეთისას: " + e.message);
        }
    });
};

// --- ავტორიზაციის ფუნქციები ---
window.handleLogin = async () => {
    try { await signInWithEmailAndPassword(auth, document.getElementById('l-email').value, document.getElementById('l-pass').value); } 
    catch(e) { window.primeShow("შეცდომა: " + e.message); }
};

window.handleRegister = async () => {
    try {
        const res = await createUserWithEmailAndPassword(auth, document.getElementById('r-email').value, document.getElementById('r-pass').value);
        await setDoc(doc(db, "users", res.user.uid), { 
            email: res.user.email, 
            phone: document.getElementById('r-phone').value, 
            address: document.getElementById('r-address').value, 
            role: "user" 
        });
    } catch(e) { window.primeShow("შეცდომა: " + e.message); }
};

window.handleLogout = () => signOut(auth).then(() => location.reload());
window.toggleProfile = () => document.getElementById('profile-modal').classList.toggle('hidden');
window.toggleAuth = () => { document.getElementById('login-form').classList.toggle('hidden'); document.getElementById('register-form').classList.toggle('hidden'); };

window.updateProfile = async () => {
    const user = auth.currentUser;
    if(user) {
        await setDoc(doc(db, "users", user.uid), {
            phone: document.getElementById('u-phone-upd').value,
            address: document.getElementById('u-address-upd').value
        }, { merge: true });
        window.primeShow("პროფილი განახლდა!");
        window.toggleProfile();
    }
};
