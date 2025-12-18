
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, query, orderBy, limit, onSnapshot, getDocs, where, increment, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBZ67Vk-HxB8tiVgVjrw5OpY1yq3mH6wzY",
  authDomain: "game-rpg-d7e05.firebaseapp.com",
  projectId: "game-rpg-d7e05",
  storageBucket: "game-rpg-d7e05.firebasestorage.app",
  messagingSenderId: "788169413552",
  appId: "1:788169413552:web:7df0ad952493c0778b7c75",
  measurementId: "G-398SV2GT04"
};

// --- МАГАЗИН ---
window.buyItem = async (name, cost, s, d) => {
    if(userData.gold >= cost) {
        await updateDoc(doc(db, "users", currentUser.uid), {
            gold: increment(-cost),
            "stats.str": increment(s),
            "stats.def": increment(d),
            inventory: [...userData.inventory, name]
        });
        alert("Покупка успешна!");
    } else alert("Нет денег!");
};

window.buySilver = async (amt, cost) => {
    if(userData.gold >= cost) {
        await updateDoc(doc(db, "users", currentUser.uid), {
            gold: increment(-cost),
            silver: increment(amt)
        });
        alert(`Куплено ${amt} серебра!`);
    } else alert("Нет денег!");
};

// --- ЧАТ ---
function renderChatPage(container) {
    container.innerHTML = `
        <div class="card">
            <h3 style="text-align:center"><i class="fa-solid fa-comments"></i> Глобальный чат</h3>
            ${userData.role === 'admin' || userData.role === 'moderator' ? '<button onclick="clearChat()" class="btn-attack" style="margin-bottom:10px">🗑️ Очистить чат</button>' : ''}
            <div id="chat-messages-page" style="height:400px; overflow-y:auto; background:#000; padding:10px; border-radius:5px; margin:10px 0;"></div>
            <div style="display:flex; gap:5px;">
                <input type="text" id="chat-input-page" placeholder="Сообщение..." style="flex:1; padding:10px; border-radius:5px; border:1px solid #333; background:#111; color:#fff;">
                <button onclick="sendMessage()" class="btn-primary" style="width:60px; margin:0;"><i class="fa fa-paper-plane"></i></button>
            </div>
        </div>
    `;
    initChatPage();
}

async function initChatPage() {
    const q = query(collection(db, "chat"), orderBy("timestamp", "desc"), limit(50));
    onSnapshot(q, (snap) => {
        const box = document.getElementById('chat-messages-page');
        if(!box) return;
        box.innerHTML = "";
        let msgs = [];
        snap.forEach(d => msgs.push({id: d.id, ...d.data()}));
        msgs.reverse().forEach(m => {
            const badge = m.role === 'admin' ? '👑' : m.role === 'moderator' ? '⭐' : '';
            const className = m.role === 'admin' ? 'msg-admin' : m.role === 'moderator' ? 'msg-mod' : 'msg';
            box.innerHTML += `<div class="${className}">${badge}<b>${m.nick}:</b> ${m.text}</div>`;
        });
        box.scrollTop = box.scrollHeight;
    });
}

window.sendMessage = async () => {
    const inp = document.getElementById('chat-input-page');
    if(!inp || !inp.value) return;
    await addDoc(collection(db, "chat"), {
        nick: userData.nickname, 
        text: inp.value.substring(0, 250), 
        timestamp: Date.now(),
        role: userData.role || 'user'
    });
    inp.value = "";
};

window.clearChat = async () => {
    if(!confirm("Очистить весь чат?")) return;
    const q = query(collection(db, "chat"));
    const snap = await getDocs(q);
    snap.forEach(async (d) => {
        await deleteDoc(doc(db, "chat", d.id));
    });
    alert("Чат очищен!");
};

// --- ФОРУМ ---
function renderForumPage(container) {
    container.innerHTML = `
        <div class="card">
            <h3 style="text-align:center"><i class="fa-solid fa-newspaper"></i> Форум</h3>
            ${userData.role === 'admin' ? '<button onclick="createForumSection()" class="btn-primary" style="margin-bottom:10px">➕ Создать раздел</button>' : ''}
            <div id="forum-sections"></div>
        </div>
    `;
    loadForumSections();
}

async function loadForumSections() {
    const sectionsSnap = await getDocs(collection(db, "forum_sections"));
    const container = document.getElementById('forum-sections');
    if(!container) return;
    
    container.innerHTML = '';
    if(sectionsSnap.empty) {
        container.innerHTML = '<p style="text-align:center; color:#666">Разделов пока нет</p>';
        return;
    }
    
    sectionsSnap.forEach(s => {
        const section = s.data();
        container.innerHTML += `
            <div class="card" style="background:#000">
                <h4>${section.name}</h4>
                <p style="color:#888; font-size:0.85em">${section.description || ''}</p>
                <button onclick="openForumSection('${s.id}', '${section.name}')" class="btn-primary">Открыть</button>
            </div>
        `;
    });
}

window.createForumSection = async () => {
    const name = prompt("Название раздела:");
    if(!name) return;
    const desc = prompt("Описание:");
    await addDoc(collection(db, "forum_sections"), {
        name: name,
        description: desc || '',
        createdAt: Date.now()
    });
    loadForumSections();
};

window.openForumSection = async (sectionId, sectionName) => {
    const container = document.getElementById('content-area');
    container.innerHTML = `
        <div class="card">
            <h3>${sectionName}</h3>
            <button onclick="renderLocation('forum')" style="background:#333; margin-bottom:10px">← Назад к разделам</button>
            <button onclick="createForumPost('${sectionId}')" class="btn-primary" style="margin-bottom:10px">➕ Создать тему</button>
            <div id="forum-posts-list"></div>
        </div>
    `;
    loadForumPosts(sectionId);
};

async function loadForumPosts(sectionId) {
    const q = query(collection(db, `forum_sections/${sectionId}/posts`), orderBy("createdAt", "desc"));
    const postsSnap = await getDocs(q);
    const container = document.getElementById('forum-posts-list');
    if(!container) return;
    
    container.innerHTML = '';
    if(postsSnap.empty) {
        container.innerHTML = '<p style="text-align:center; color:#666">Тем пока нет</p>';
        return;
    }
    
    postsSnap.forEach(p => {
        const post = p.data();
        const badge = post.authorRole === 'admin' ? '👑' : post.authorRole === 'moderator' ? '⭐' : '';
        container.innerHTML += `
            <div class="card" style="background:#111">
                <h4>${post.title}</h4>
                <p style="color:#999; font-size:0.8em">${badge}${post.author} • ${new Date(post.createdAt).toLocaleDateString()}</p>
                <button onclick="openForumPost('${sectionId}', '${p.id}', '${post.title}')" class="btn-primary">Читать</button>
            </div>
        `;
    });
}

window.createForumPost = async (sectionId) => {
    const title = prompt("Заголовок темы:");
    if(!title) return;
    const text = prompt("Текст сообщения:");
    if(!text) return;
    
    await addDoc(collection(db, `forum_sections/${sectionId}/posts`), {
        title: title,
        text: text,
        author: userData.nickname,
        authorRole: userData.role || 'user',
        createdAt: Date.now()
    });
    openForumSection(sectionId, '');
};

window.openForumPost = async (sectionId, postId, postTitle) => {
    const container = document.getElementById('content-area');
    const postDoc = await getDoc(doc(db, `forum_sections/${sectionId}/posts`, postId));
    const post = postDoc.data();
    const badge = post.authorRole === 'admin' ? '👑' : post.authorRole === 'moderator' ? '⭐' : '';
    
    container.innerHTML = `
        <div class="card">
            <button onclick="openForumSection('${sectionId}', '')" style="background:#333; margin-bottom:10px">← Назад к темам</button>
            <h3>${post.title}</h3>
            <p style="color:#999; font-size:0.8em">${badge}${post.author} • ${new Date(post.createdAt).toLocaleDateString()}</p>
            <div style="background:#000; padding:15px; border-radius:5px; margin:10px 0;">
                ${post.text}
            </div>
            <h4>Комментарии</h4>
            <div id="forum-comments"></div>
            <textarea id="comment-input" placeholder="Ваш комментарий..." style="width:100%; padding:10px; background:#000; color:#fff; border:1px solid #333; border-radius:5px; margin-top:10px; min-height:60px;"></textarea>
            <button onclick="addForumComment('${sectionId}', '${postId}')" class="btn-primary">Отправить</button>
        </div>
    `;
    loadForumComments(sectionId, postId);
};

async function loadForumComments(sectionId, postId) {
    const q = query(collection(db, `forum_sections/${sectionId}/posts/${postId}/comments`), orderBy("createdAt", "asc"));
    const commentsSnap = await getDocs(q);
    const container = document.getElementById('forum-comments');
    if(!container) return;
    
    container.innerHTML = '';
    commentsSnap.forEach(c => {
        const comment = c.data();
        const badge = comment.authorRole === 'admin' ? '👑' : comment.authorRole === 'moderator' ? '⭐' : '';
        container.innerHTML += `
            <div class="card" style="background:#111">
                <p style="color:#999; font-size:0.8em">${badge}<b>${comment.author}</b> • ${new Date(comment.createdAt).toLocaleDateString()}</p>
                <p>${comment.text}</p>
            </div>
        `;
    });
}

window.addForumComment = async (sectionId, postId) => {
    const text = document.getElementById('comment-input').value;
    if(!text) return;
    
    await addDoc(collection(db, `forum_sections/${sectionId}/posts/${postId}/comments`), {
        text: text,
        author: userData.nickname,
        authorRole: userData.role || 'user',
        createdAt: Date.now()
    });
    
    document.getElementById('comment-input').value = '';
    loadForumComments(sectionId, postId);
};

// --- АДМИНКА ---
function renderAdminPanel(container) {
    container.innerHTML = `
        <div class="card">
            <h3 style="color:var(--red)">🔒 Панель ${userData.role === 'admin' ? 'Администратора' : 'Модератора'}</h3>
            
            <h4 style="margin-top:20px">Поиск игрока</h4>
            <input type="text" id="adm-search" placeholder="Никнейм или UID" style="width:100%; margin-bottom:10px">
            <button onclick="adminSearchPlayer()" class="btn-primary">Найти</button>
            
            ${userData.role === 'admin' ? `
                <h4 style="margin-top:20px">Назначить модератора</h4>
                <input type="text" id="mod-uid" placeholder="UID игрока" style="width:100%; margin-bottom:10px">
                <button onclick="setModerator()" class="btn-gold">Назначить</button>
            ` : ''}
            
            <div id="admin-player-info" style="margin-top:15px"></div>
        </div>
    `;
}

window.setModerator = async () => {
    const uid = document.getElementById('mod-uid').value;
    if(!uid) return alert("Введите UID");
    if(userData.role !== 'admin') return alert("Только для админов!");
    
    await updateDoc(doc(db, "users", uid), { role: "moderator" });
    alert("Модератор назначен!");
};

window.adminSearchPlayer = async () => {
    const search = document.getElementById('adm-search').value.trim();
    if(!search) return alert("Введите никнейм или UID");
    
    const infoDiv = document.getElementById('admin-player-info');
    infoDiv.innerHTML = "<p>Поиск...</p>";
    
    let userDoc = await getDoc(doc(db, "users", search));
    
    if(!userDoc.exists()) {
        const q = query(collection(db, "users"), where("nickname", "==", search));
        const snap = await getDocs(q);
        if(snap.empty) {
            infoDiv.innerHTML = "<p style='color:red'>Игрок не найден</p>";
            return;
        }
        userDoc = snap.docs[0];
    }
    
    const player = userDoc.data();
    const playerId = userDoc.id;
    
    let clanName = "Нет";
    if(player.clanId) {
        const clanDoc = await getDoc(doc(db, "clans", player.clanId));
        if(clanDoc.exists()) clanName = clanDoc.data().name;
    }
    
    const isAdmin = userData.role === 'admin';
    
    infoDiv.innerHTML = `
        <div class="card" style="background:#000; border:2px solid var(--accent)">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px">
                <img src="${player.avatar}" style="width:50px; height:50px; border-radius:50%">
                <div>
                    <h4 style="margin:0">${player.nickname}</h4>
                    <small style="color:#999">UID: ${playerId}</small>
                </div>
            </div>
            
            <div style="background:#111; padding:10px; border-radius:5px; margin-bottom:10px">
                <p>Роль: ${player.role || 'user'}</p>
                <p>Уровень: ${player.lvl}/50 | Опыт: ${player.exp}/${expForLevel(player.lvl)}</p>
                <p>💰 Золото: ${player.gold} | 💎 Серебро: ${player.silver}</p>
                <p>⚔️ Сила: ${player.stats.str} | 🛡️ Защита: ${player.stats.def} | ❤️ HP: ${player.stats.hp}</p>
                <p>Клан: ${clanName} (${player.clanRank})</p>
                <p>Статус: ${player.isBanned ? '<span style="color:red">ЗАБАНЕН</span>' : '<span style="color:green">Активен</span>'}</p>
            </div>
            
            <h4>Действия</h4>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px">
                ${isAdmin ? `
                    <button onclick="adminGiveGold('${playerId}')" class="btn-buy">+💰 Золото</button>
                    <button onclick="adminGiveSilver('${playerId}')" class="btn-buy">+💎 Серебро</button>
                    <button onclick="adminSetLevel('${playerId}')" class="btn-primary">Установить уровень</button>
                    <button onclick="adminGiveExp('${playerId}')" class="btn-primary">+Опыт</button>
                    <button onclick="adminChangeClan('${playerId}')" class="btn-gold">Сменить клан</button>
                    <button onclick="adminChangeRank('${playerId}')" class="btn-gold">Сменить звание</button>
                ` : ''}
                <button onclick="adminBan('${playerId}', ${player.isBanned})" class="btn-attack">${player.isBanned ? 'Разбанить' : 'Забанить'}</button>
                ${isAdmin ? `<button onclick="adminResetPlayer('${playerId}')" style="background:#666">Сбросить прогресс</button>` : ''}
            </div>
        </div>
    `;
};

window.adminGiveGold = async (uid) => {
    const amt = parseInt(prompt("Сколько золота дать?", "1000"));
    if(amt && amt > 0) {
        await updateDoc(doc(db, "users", uid), { gold: increment(amt) });
        alert(`Выдано ${amt} золота`);
        adminSearchPlayer();
    }
};

window.adminGiveSilver = async (uid) => {
    const amt = parseInt(prompt("Сколько серебра дать?", "100"));
    if(amt && amt > 0) {
        await updateDoc(doc(db, "users", uid), { silver: increment(amt) });
        alert(`Выдано ${amt} серебра`);
        adminSearchPlayer();
    }
};

window.adminSetLevel = async (uid) => {
    const lvl = parseInt(prompt("Установить уровень (1-50):", "1"));
    if(lvl && lvl > 0 && lvl <= 50) {
        await updateDoc(doc(db, "users", uid), { lvl: lvl, exp: 0 });
        alert(`Уровень установлен: ${lvl}`);
        adminSearchPlayer();
    }
};

window.adminGiveExp = async (uid) => {
    const amt = parseInt(prompt("Сколько опыта дать?", "1000"));
    if(amt && amt > 0) {
        await updateDoc(doc(db, "users", uid), { exp: increment(amt) });
        alert(`Выдано ${amt} опыта`);
        adminSearchPlayer();
    }
};

window.adminChangeClan = async (uid) => {
    const clansSnap = await getDocs(collection(db, "clans"));
    let clansList = "Доступные кланы:\n";
    const clansMap = {};
    let idx = 1;
    clansSnap.forEach(c => {
        clansMap[idx] = c.id;
        clansList += `${idx}. ${c.data().name}\n`;
        idx++;
    });
    clansList += "0. Убрать из клана";
    
    const choice = prompt(clansList);
    if(choice === "0") {
        await updateDoc(doc(db, "users", uid), { clanId: null, clanRank: "Новичок" });
        alert("Игрок удалён из клана");
    } else if(clansMap[choice]) {
        await updateDoc(doc(db, "users", uid), { clanId: clansMap[choice], clanRank: "Рекрут" });
        alert("Клан изменён");
    }
    adminSearchPlayer();
};

window.adminChangeRank = async (uid) => {
    let rankList = "Выберите звание:\n";
    rankNames.forEach((r, i) => rankList += `${i}. ${r}\n`);
    
    const choice = parseInt(prompt(rankList));
    if(choice >= 0 && choice < rankNames.length) {
        await updateDoc(doc(db, "users", uid), { clanRank: rankNames[choice] });
        alert(`Звание изменено на ${rankNames[choice]}`);
        adminSearchPlayer();
    }
};

window.adminBan = async (uid, isBanned) => {
    if(confirm(isBanned ? "Разбанить игрока?" : "Забанить игрока?")) {
        await updateDoc(doc(db, "users", uid), { isBanned: !isBanned });
        alert(isBanned ? "Игрок разбанен" : "Игрок забанен");
        adminSearchPlayer();
    }
};

window.adminResetPlayer = async (uid) => {
    if(confirm("ВНИМАНИЕ! Это сбросит весь прогресс игрока. Продолжить?")) {
        await updateDoc(doc(db, "users", uid), {
            lvl: 1,
            exp: 0,
            gold: 100,
            silver: 0,
            stats: { str: 10, hp: 100, def: 5 },
            inventory: [],
            clanId: null,
            clanRank: "Новичок"
        });
        alert("Прогресс игрока сброшен");
        adminSearchPlayer();
    }
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let currentUser = null;
let userData = null;
let chatUnsubscribe = null;
let clanUnsubscribe = null;
let clanChatUnsubscribe = null;

// Порядок званий (для проверки прав)
const rankPower = {
    "Глава": 5,
    "Зам.Глава": 4,
    "Генерал": 3,
    "Офицер": 2,
    "Рекрут": 1,
    "Новичок": 0
};

const rankNames = ["Новичок", "Рекрут", "Офицер", "Генерал", "Зам.Глава", "Глава"];

// Расчёт опыта для уровня
function expForLevel(lvl) {
    return Math.floor(lvl * 1000 + Math.pow(lvl, 2) * 50);
}

// --- АВТОРИЗАЦИЯ ---
window.register = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const nick = document.getElementById('nickname').value;
    if(!nick || !email || !pass) return alert("Заполни все поля!");

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        const newUser = {
            nickname: nick,
            email: email,
            lvl: 1, exp: 0, gold: 100, silver: 0,
            stats: { str: 10, hp: 100, def: 5 },
            clanId: null,
            clanRank: "Новичок",
            inventory: [],
            avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${nick}`,
            isBanned: false,
            role: (email === "petrusenko4546@proton.me") ? "admin" : "user"
        };
        await setDoc(doc(db, "users", cred.user.uid), newUser);
    } catch (e) { alert("Ошибка регистрации: " + e.message); }
};

window.login = async () => {
    try { 
        await signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value); 
    } catch (e) { alert("Ошибка входа: проверьте почту и пароль"); }
};

window.logout = () => { signOut(auth); window.location.reload(); };

onAuthStateChanged(auth, async (user) => {
    if (user) {
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if(docSnap.exists()) {
                userData = docSnap.data();
                if(userData.isBanned) { 
                    alert("Вы забанены!"); 
                    signOut(auth); 
                    return; 
                }
                currentUser = user;
                updateUI();
                if(document.getElementById('clan-view')) renderClanContent();
            }
        });

        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        document.getElementById('nav-bar').style.display = 'flex';
        
        if(user.email === "petrusenko4546@proton.me" || userData?.role === "admin" || userData?.role === "moderator") {
            document.getElementById('nav-admin').style.display = 'flex';
        }
        renderLocation('profile');
    }
});

async function updateUI() {
    if(!userData) return;
    
    // Проверка повышения уровня
    const expNeed = expForLevel(userData.lvl);
    if(userData.exp >= expNeed && userData.lvl < 50) {
        await updateDoc(doc(db, "users", currentUser.uid), {
            lvl: userData.lvl + 1,
            exp: userData.exp - expNeed,
            "stats.hp": increment(20),
            "stats.str": increment(5),
            "stats.def": increment(3)
        });
    }
    
    document.getElementById('user-level').innerText = `LVL ${userData.lvl}`;
    const expPerc = Math.min(100, (userData.exp / expNeed) * 100);
    document.getElementById('exp-bar').style.width = expPerc + "%";
    document.getElementById('exp-text').innerText = Math.floor(expPerc) + "%";
    document.getElementById('res-gold').innerText = userData.gold;
    document.getElementById('res-silver').innerText = userData.silver;
    document.getElementById('stat-str').innerText = userData.stats.str;
    document.getElementById('stat-hp').innerText = userData.stats.hp;
    document.getElementById('stat-def').innerText = userData.stats.def;
    
    // Бонусы от клана
    if(userData.clanId) {
        const clanDoc = await getDoc(doc(db, "clans", userData.clanId));
        if(clanDoc.exists()) {
            const clan = clanDoc.data();
            const strBonus = clan.buildings.power * 25;
            const defBonus = clan.buildings.def * 15;
            document.getElementById('stat-str-bonus').innerText = strBonus > 0 ? `+${strBonus}` : '';
            document.getElementById('stat-def-bonus').innerText = defBonus > 0 ? `+${defBonus}` : '';
        }
    } else {
        document.getElementById('stat-str-bonus').innerText = '';
        document.getElementById('stat-def-bonus').innerText = '';
    }
}

window.renderLocation = (loc) => {
    const container = document.getElementById('content-area');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('nav-' + loc)?.classList.add('active');

    if (loc === 'profile') {
        container.innerHTML = `
            <div class="card profile-header fade-in">
                <img src="${userData.avatar}" class="avatar" id="profile-avatar">
                <div style="flex:1">
                    <h2 style="margin:0; color:var(--accent)">${userData.nickname}</h2>
                    <small style="color:#777">${userData.clanId ? userData.clanRank : 'Без клана'}</small>
                </div>
                <button onclick="changeAvatar()" class="btn-small">📷</button>
            </div>
            <div class="card fade-in">
                <h4>🎒 Рюкзак</h4>
                <div style="font-size:0.9em;">${userData.inventory.length ? userData.inventory.join(", ") : "Пусто"}</div>
            </div>
            <button onclick="logout()" style="background:#222; margin-top:10px;">Выйти</button>
        `;
    } else if (loc === 'dungeon') {
        container.innerHTML = `
            <h2 style="text-align:center;"><i class="fa-solid fa-skull"></i> Подземелье</h2>
            <div class="card">
                <h3>Скелет (Ур. 1)</h3>
                <p>Сила врага: 5</p>
                <button class="btn-attack" onclick="fight(1, 15, 100)">⚔️ Сразиться</button>
            </div>
            <div class="card">
                <h3>Орк (Ур. 5)</h3>
                <p>Сила врага: 25</p>
                <button class="btn-attack" onclick="fight(5, 100, 500)">⚔️ Сразиться</button>
            </div>
            <div class="card">
                <h3>Тролль (Ур. 10)</h3>
                <p>Сила врага: 50</p>
                <button class="btn-attack" onclick="fight(10, 300, 1200)">⚔️ Сразиться</button>
            </div>
            <div class="card">
                <h3>Дракон (Ур. 20)</h3>
                <p>Сила врага: 100</p>
                <button class="btn-attack" onclick="fight(20, 1000, 3000)">⚔️ Сразиться</button>
            </div>
            <div class="card">
                <h3>Древний Дракон (Ур. 35)</h3>
                <p>Сила врага: 175</p>
                <button class="btn-attack" onclick="fight(35, 3000, 8000)">⚔️ Сразиться</button>
            </div>
        `;
    } else if (loc === 'shop') {
        container.innerHTML = `
            <h2 style="text-align:center;"><i class="fa-solid fa-coins"></i> Магазин</h2>
            <div class="card">
                <b>Обычный меч (+15 Сила)</b><br>Цена: 100 💰
                <button class="btn-buy" onclick="buyItem('Обычный меч', 100, 15, 0)">Купить</button>
            </div>
            <div class="card">
                <b>Обычная руна (+25 Сила)</b><br>Цена: 250 💰
                <button class="btn-buy" onclick="buyItem('Обычная руна', 250, 25, 0)">Купить</button>
            </div>
            <div class="card">
                <b>Щит защитника (+20 Защита)</b><br>Цена: 300 💰
                <button class="btn-buy" onclick="buyItem('Щит защитника', 300, 0, 20)">Купить</button>
            </div>
            <div class="card">
                <b>Серебро (10 шт)</b><br>Цена: 100 💰
                <button class="btn-buy" onclick="buySilver(10, 100)">Купить</button>
            </div>
        `;
    } else if (loc === 'clan') {
        container.innerHTML = `<div id="clan-view">Загрузка...</div>`;
        renderClanContent();
    } else if (loc === 'chat') {
        renderChatPage(container);
    } else if (loc === 'forum') {
        renderForumPage(container);
    } else if (loc === 'admin') {
        renderAdminPanel(container);
    }
};

// --- СМЕНА АВАТАРА ---
window.changeAvatar = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        if(file.size > 150 * 1024) return alert("Файл больше 150 КБ!");
        
        const storageRef = ref(storage, `avatars/${currentUser.uid}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "users", currentUser.uid), { avatar: url });
        alert("Аватар обновлён!");
    };
    input.click();
};

// --- КЛАНЫ ---
async function renderClanContent() {
    const view = document.getElementById('clan-view');
    if(!userData.clanId) {
        view.innerHTML = `
            <div class="card" style="text-align:center">
                <h3>Нужен клан?</h3>
                <input type="text" id="new-clan-name" placeholder="Название" style="width:100%; margin:10px 0;">
                <button class="btn-gold" onclick="createClan()">Создать (1000 💰)</button>
            </div>
            <div class="card">
                <h3>Игроки без клана</h3>
                <button class="btn-primary" onclick="searchPlayersNoClan()">🔍 Поиск</button>
                <div id="players-no-clan"></div>
            </div>
            <h3 style="margin-top:20px;">Доступные кланы:</h3>
            <div id="clan-list"></div>
        `;
        loadClanList();
    } else {
        if(clanUnsubscribe) clanUnsubscribe();
        clanUnsubscribe = onSnapshot(doc(db, "clans", userData.clanId), async (snap) => {
            if(!snap.exists()) return;
            const clan = snap.data();
            const canManage = rankPower[userData.clanRank] >= 4;
            const canPromote = rankPower[userData.clanRank] >= 3;

            // Получаем список участников
            const membersSnap = await getDocs(query(collection(db, "users"), where("clanId", "==", userData.clanId)));
            let membersList = '';
            membersSnap.forEach(m => {
                const member = m.data();
                const canEdit = rankPower[userData.clanRank] > rankPower[member.clanRank];
                membersList += `
                    <div class="member-card">
                        <img src="${member.avatar}" class="member-avatar">
                        <div style="flex:1">
                            <b>${member.nickname}</b>
                            <div style="color:#999; font-size:0.8em">${member.clanRank} | Ур.${member.lvl}</div>
                            <div style="color:#888; font-size:0.75em">⚔️${member.stats.str} 🛡️${member.stats.def}</div>
                        </div>
                        ${canEdit ? `<button onclick="manageMember('${m.id}', '${member.nickname}')" class="btn-small">⚙️</button>` : ''}
                    </div>
                `;
            });

            view.innerHTML = `
                <div class="card" style="border-color:var(--gold)">
                    <h2 style="text-align:center; margin:0">${clan.name}</h2>
                    <p style="text-align:center; color:var(--accent)">Ваше звание: ${userData.clanRank}</p>
                    <p style="text-align:center; color:#999">Уровень клана: ${clan.level || 1}/25</p>
                    <div style="background:#111; padding:10px; border-radius:5px;">
                        🏛️ Казна: <b style="color:var(--gold)">${clan.treasury}</b>
                        <button onclick="donateClan()" style="width:auto; float:right; margin:0;">Взнос</button>
                    </div>
                </div>
                
                <div class="card">
                    <button class="btn-primary" onclick="searchPlayersNoClan()">🔍 Пригласить в клан</button>
                </div>

                <div class="card">
                    <h4>📋 Задания клана</h4>
                    <button class="btn-gold" onclick="showClanQuests()">Открыть задания</button>
                </div>

                <div class="card">
                    <h4>💬 Чат клана</h4>
                    <button class="btn-primary" onclick="openClanChat()">Открыть чат</button>
                </div>
                
                <div class="card">
                    <h4>🗼 Башня Силы (Ур. ${clan.buildings.power})</h4>
                    <small>Дает: +${clan.buildings.power * 25} к силе всем участникам</small>
                    ${canManage ? `<button class="btn-primary" onclick="upgradeBuilding('power')">Улучшить (${clan.buildings.power * 500} 💰)</button>` : ''}
                </div>
                <div class="card">
                    <h4>🛡️ Башня Защиты (Ур. ${clan.buildings.def})</h4>
                    <small>Дает: +${clan.buildings.def * 15} к защите всем участникам</small>
                    ${canManage ? `<button class="btn-primary" onclick="upgradeBuilding('def')">Улучшить (${clan.buildings.def * 500} 💰)</button>` : ''}
                </div>
                <div class="card">
                    <h4>⭐ Башня Опыта (Ур. ${clan.buildings.exp})</h4>
                    <small>Дает: +${clan.buildings.exp * 10}% опыта всем участникам</small>
                    ${canManage ? `<button class="btn-primary" onclick="upgradeBuilding('exp')">Улучшить (${clan.buildings.exp * 500} 💰)</button>` : ''}
                </div>
                <div class="card">
                    <h4>👥 Участники клана (${membersSnap.size})</h4>
                    ${membersList}
                </div>
                ${canManage ? `<button class="btn-gold" onclick="levelUpClan()">Повысить уровень клана (${(clan.level || 1) * 5000} 💰)</button>` : ''}
                <button onclick="leaveClan()" style="background:#333;">Покинуть клан</button>
            `;
        });
    }
}

// Поиск игроков без клана
window.searchPlayersNoClan = async () => {
    const q = query(collection(db, "users"), where("clanId", "==", null));
    const snap = await getDocs(q);
    
    let html = '<h4 style="margin-top:15px">Игроки без клана:</h4>';
    snap.forEach(p => {
        const player = p.data();
        html += `
            <div class="member-card">
                <img src="${player.avatar}" class="member-avatar">
                <div style="flex:1">
                    <b>${player.nickname}</b>
                    <div style="color:#888; font-size:0.75em">Ур.${player.lvl} | ⚔️${player.stats.str} 🛡️${player.stats.def} ❤️${player.stats.hp}</div>
                </div>
                ${userData.clanId ? `<button onclick="invitePlayer('${p.id}')" class="btn-small">✉️</button>` : ''}
            </div>
        `;
    });
    
    const targetDiv = document.getElementById('players-no-clan') || document.getElementById('clan-view');
    if(targetDiv.id === 'clan-view') {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = html;
        targetDiv.appendChild(card);
    } else {
        targetDiv.innerHTML = html;
    }
};

// Приглашение в клан
window.invitePlayer = async (uid) => {
    if(!userData.clanId) return alert("Вы не в клане!");
    if(rankPower[userData.clanRank] < 3) return alert("Недостаточно прав!");
    
    const clanDoc = await getDoc(doc(db, "clans", userData.clanId));
    await addDoc(collection(db, "notifications"), {
        to: uid,
        from: currentUser.uid,
        type: "clan_invite",
        clanId: userData.clanId,
        clanName: clanDoc.data().name,
        timestamp: Date.now()
    });
    alert("Приглашение отправлено!");
};

// Чат клана
window.openClanChat = () => {
    const view = document.getElementById('clan-view');
    view.innerHTML = `
        <div class="card">
            <h3 style="text-align:center">💬 Чат клана</h3>
            <button onclick="renderClanContent()" style="background:#333; margin-bottom:10px">← Назад</button>
            <div id="clan-chat-messages" style="height:300px; overflow-y:auto; background:#000; padding:10px; border-radius:5px; margin:10px 0;"></div>
            <div style="display:flex; gap:5px;">
                <input type="text" id="clan-chat-input" placeholder="Сообщение..." style="flex:1; padding:10px; border-radius:5px; border:1px solid #333; background:#111; color:#fff;">
                <button onclick="sendClanMessage()" class="btn-primary" style="width:60px; margin:0;"><i class="fa fa-paper-plane"></i></button>
            </div>
        </div>
    `;
    initClanChat();
};

async function initClanChat() {
    if(!userData.clanId) return;
    const q = query(collection(db, `clans/${userData.clanId}/chat`), orderBy("timestamp", "desc"), limit(50));
    if(clanChatUnsubscribe) clanChatUnsubscribe();
    clanChatUnsubscribe = onSnapshot(q, (snap) => {
        const box = document.getElementById('clan-chat-messages');
        if(!box) return;
        box.innerHTML = "";
        let msgs = [];
        snap.forEach(d => msgs.push({id: d.id, ...d.data()}));
        msgs.reverse().forEach(m => {
            box.innerHTML += `<div class="msg"><b>${m.nick}:</b> ${m.text}</div>`;
        });
        box.scrollTop = box.scrollHeight;
    });
}

window.sendClanMessage = async () => {
    const inp = document.getElementById('clan-chat-input');
    if(!inp || !inp.value || !userData.clanId) return;
    await addDoc(collection(db, `clans/${userData.clanId}/chat`), {
        nick: userData.nickname,
        text: inp.value.substring(0, 250),
        timestamp: Date.now()
    });
    inp.value = "";
};

// Задания клана
window.showClanQuests = () => {
    const view = document.getElementById('clan-view');
    view.innerHTML = `
        <div class="card">
            <h3>📋 Задания клана</h3>
            <button onclick="renderClanContent()" style="background:#333; margin-bottom:10px">← Назад</button>
            <div class="card" style="background:#000">
                <h4>Убить 10 врагов</h4>
                <p>Награда: 1000 💰 в казну</p>
                <button class="btn-gold">Выполнить</button>
            </div>
            <div class="card" style="background:#000">
                <h4>Собрать 5000 золота</h4>
                <p>Награда: 500 опыта клану</p>
                <button class="btn-gold">Выполнить</button>
            </div>
        </div>
    `;
};

// Повышение уровня клана
window.levelUpClan = async () => {
    const clanSnap = await getDoc(doc(db, "clans", userData.clanId));
    const clan = clanSnap.data();
    const currentLvl = clan.level || 1;
    if(currentLvl >= 25) return alert("Максимальный уровень!");
    const cost = currentLvl * 5000;
    if(clan.treasury >= cost) {
        await updateDoc(doc(db, "clans", userData.clanId), {
            treasury: clan.treasury - cost,
            level: currentLvl + 1
        });
        alert(`Клан повышен до уровня ${currentLvl + 1}!`);
    } else alert("Недостаточно золота в казне!");
};

async function loadClanList() {
    const clansSnap = await getDocs(collection(db, "clans"));
    const listDiv = document.getElementById('clan-list');
    listDiv.innerHTML = '';
    clansSnap.forEach(c => {
        const clan = c.data();
        listDiv.innerHTML += `
            <div class="card">
                <h4>${clan.name} (Ур. ${clan.level || 1})</h4>
                <button onclick="joinClan('${c.id}')" class="btn-primary">Вступить</button>
            </div>
        `;
    });
}

window.createClan = async () => {
    const name = document.getElementById('new-clan-name').value;
    if(!name) return alert("Введите название!");
    if(userData.gold < 1000) return alert("Мало золота!");
    const clanRef = await addDoc(collection(db, "clans"), {
        name: name, leaderId: currentUser.uid, treasury: 0, level: 1,
        buildings: { power: 1, def: 1, exp: 1 }
    });
    await updateDoc(doc(db, "users", currentUser.uid), {
        gold: userData.gold - 1000,
        clanId: clanRef.id,
        clanRank: "Глава"
    });
};

window.joinClan = async (clanId) => {
    if(userData.clanId) return alert("Вы уже в клане!");
    await updateDoc(doc(db, "users", currentUser.uid), {
        clanId: clanId,
        clanRank: "Рекрут"
    });
    renderClanContent();
};

window.leaveClan = async () => {
    if(!confirm("Точно покинуть клан?")) return;
    await updateDoc(doc(db, "users", currentUser.uid), {
        clanId: null,
        clanRank: "Новичок"
    });
    renderClanContent();
};

window.donateClan = async () => {
    const amt = parseInt(prompt("Сколько золота внести в казну?"));
    if(amt > 0 && userData.gold >= amt) {
        await updateDoc(doc(db, "users", currentUser.uid), { gold: userData.gold - amt });
        await updateDoc(doc(db, "clans", userData.clanId), { treasury: increment(amt) });
    }
};

window.upgradeBuilding = async (type) => {
    const clanSnap = await getDoc(doc(db, "clans", userData.clanId));
    const clan = clanSnap.data();
    const cost = clan.buildings[type] * 500;
    if(clan.treasury >= cost) {
        await updateDoc(doc(db, "clans", userData.clanId), {
            treasury: clan.treasury - cost,
            [`buildings.${type}`]: increment(1)
        });
    } else alert("В казне мало золота!");
};

window.manageMember = async (uid, nickname) => {
    const action = prompt(`Управление ${nickname}:\n1 - Повысить\n2 - Понизить\n3 - Исключить`);
    
    if(action === '1') {
        const memberSnap = await getDoc(doc(db, "users", uid));
        const member = memberSnap.data();
        const currentIdx = rankNames.indexOf(member.clanRank);
        if(currentIdx < rankNames.length - 1 && currentIdx < rankNames.indexOf(userData.clanRank) - 1) {
            await updateDoc(doc(db, "users", uid), { clanRank: rankNames[currentIdx + 1] });
            alert("Звание повышено!");
        } else alert("Нельзя повысить выше своего звания!");
    } else if(action === '2') {
        const memberSnap = await getDoc(doc(db, "users", uid));
        const member = memberSnap.data();
        const currentIdx = rankNames.indexOf(member.clanRank);
        if(currentIdx > 1) {
            await updateDoc(doc(db, "users", uid), { clanRank: rankNames[currentIdx - 1] });
            alert("Звание понижено!");
        }
    } else if(action === '3') {
        await updateDoc(doc(db, "users", uid), { clanId: null, clanRank: "Новичок" });
        alert("Участник исключён!");
    }
    renderClanContent();
};

// --- БОЙ ---
window.fight = async (m_lvl, m_gold, m_exp) => {
    let bonusStr = 0, bonusExp = 0;
    if(userData.clanId) {
        const c = await getDoc(doc(db, "clans", userData.clanId));
        if(c.exists()) {
            bonusStr = c.data().buildings.power * 25;
            bonusExp = Math.floor(m_exp * (c.data().buildings.exp * 10 / 100));
        }
    }
    const totalStr = userData.stats.str + bonusStr;
    const reqStr = m_lvl * 5;
    
    if(totalStr >= reqStr) {
        const totalExp = m_exp + bonusExp;
        await updateDoc(doc(db, "users", currentUser.uid), {
            gold: increment(m_gold),
            exp: increment(totalExp)
        });
        alert(`Победа! +${m_gold} золота, +${totalExp} опыта`);
    } else {
        alert(`Вы слишком слабы! Нужно ${reqStr} силы (у вас ${totalStr})`);
    }