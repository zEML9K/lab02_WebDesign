document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;

    if (page === "main") initMainPage();
    if (page === "test") initTestPage();
    if (page === "result") loadResults();
});

// ---------------------- MAIN PAGE ----------------------
function initMainPage() {
    const form = document.getElementById("student-form");
    const nameInput = document.getElementById("studentName");
    const groupInput = document.getElementById("studentGroup");
    const levelBtns = document.querySelectorAll(".choose-level");

    // Функція для блокування/розблокування кнопок
    function updateButtons() {
        const name = nameInput.value.trim();
        const group = groupInput.value.trim();

        levelBtns.forEach(btn => {
            btn.disabled = !(name && group);
        });
    }

    // Викликаємо при завантаженні
    updateButtons();

    // Оновлюємо при вводі
    nameInput.addEventListener("input", updateButtons);
    groupInput.addEventListener("input", updateButtons);

    form.addEventListener("submit", e => {
        e.preventDefault();
        const name = nameInput.value.trim();
        const group = groupInput.value.trim();

        localStorage.setItem("studentName", name);
        localStorage.setItem("studentGroup", group);
        alert("Дані збережено");

        // Розблоковуємо кнопки після збереження
        updateButtons();
    });

    levelBtns.forEach(btn => btn.addEventListener("click", () => {
        localStorage.setItem("testLevel", btn.dataset.level);
        location.href = "test.html";
    }));
}

// ---------------------- TEST PAGE ----------------------
let currentIndex = 0;
let score = 0;
let quiz = [];
let currentQuestionObj;

function initTestPage() {
    const name = localStorage.getItem("studentName") || "";
    const group = localStorage.getItem("studentGroup") || "";
    const header = document.querySelector("header h1");
    if (header) header.textContent += ` — ${group} | ${name}`; // ПІБ та група в header

    const level = localStorage.getItem("testLevel");
    switch(level) {
        case "A": quiz = shuffle(questionsA).slice(0,10); break;
        case "B": quiz = shuffle(questionsB).slice(0,10); break;
        case "C": quiz = shuffle(questionsC).slice(0,10); break;
        default: quiz = [];
    }

    currentIndex = 0;
    score = 0;
    renderQuestion();

    document.getElementById("next-btn").addEventListener("click", nextQuestion);
    document.getElementById("finish-btn").addEventListener("click", finishTest);
}

// ---------------------- QUESTION CLASSES ----------------------
class Question {
    constructor(q) {
        this.q = q.q;
        this.type = q.type;
        this.answers = q.answers || [];
        this.correct = q.correct;
        this.items = q.items || [];
        this.targets = q.targets || [];
        this.correctMapping = q.correctMapping || {};
    }
    render(box) {}
    check(box) { return false; }
}

class RadioQuestion extends Question {
    render(box) {
        const shuffled = shuffle(this.answers.slice());
        shuffled.forEach(a => {
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'q';
            input.value = a;
            label.appendChild(input);
            label.appendChild(document.createTextNode(a));
            box.appendChild(label);
            box.appendChild(document.createElement("br"));
        });
    }
    check(box) {
        const r = box.querySelector("input:checked");
        return r && r.value === this.correct;
    }
}

class CheckboxQuestion extends Question {
    render(box) {
        const shuffled = shuffle(this.answers.slice());
        shuffled.forEach(a => {
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.value = a;
            label.appendChild(input);
            label.appendChild(document.createTextNode(a));
            box.appendChild(label);
            box.appendChild(document.createElement("br"));
        });
    }
    check(box) {
        const selected = [...box.querySelectorAll("input:checked")].map(c => c.value).sort();
        return arraysEqual(selected, this.correct.slice().sort());
    }
}

class SelectQuestion extends Question {
    render(box) {
        const select = document.createElement('select');
        const shuffled = shuffle(this.answers.slice());
        shuffled.forEach(a => {
            const option = document.createElement('option');
            option.value = a;
            option.textContent = a;
            select.appendChild(option);
        });
        box.appendChild(select);
    }
    check(box) {
        const v = box.querySelector("select").value;
        if (this.correct === "обидва") return true;
        return v === this.correct;
    }
}

class TextQuestion extends Question {
    render(box) {
        const inp = document.createElement("input");
        inp.type = "text";
        box.appendChild(inp);
    }
    check(box) {
        const v = box.querySelector("input").value.trim();
        return v === this.correct;
    }
}

class TextareaQuestion extends Question {
    render(box) {
        const t = document.createElement("textarea");
        box.appendChild(t);
    }
    check(box) {
        const v = box.querySelector("textarea").value.replace(/\s/g, "");
        const c = this.correct.replace(/\s/g, "");
        return v === c;
    }
}

class FillQuestion extends TextQuestion {}

class DragQuestion extends Question {
    render(box) {
        renderDragDrop(box, this);
    }
    check(box) {
        return checkDragAnswer(box, this.correctMapping);
    }
}

// ---------------------- HELPERS ----------------------
function createQuestionObj(q) {
    switch(q.type) {
        case "radio": return new RadioQuestion(q);
        case "checkbox": return new CheckboxQuestion(q);
        case "select": return new SelectQuestion(q);
        case "text": return new TextQuestion(q);
        case "textarea": return new TextareaQuestion(q);
        case "fill": return new FillQuestion(q);
        case "drag": return new DragQuestion(q);
        default: return new Question(q);
    }
}

// Drag & Drop
function renderDragDrop(container, qObj) {
    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'items';
    qObj.items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'draggable';
        el.textContent = item;
        el.draggable = true;
        el.addEventListener('dragstart', e => e.dataTransfer.setData("text/plain", item));
        itemsDiv.appendChild(el);
    });
    container.appendChild(itemsDiv);

    const targetsDiv = document.createElement('div');
    targetsDiv.className = 'targets';
    qObj.targets.forEach(targetText => {
        const el = document.createElement('div');
        el.className = 'target';
        el.textContent = targetText;
        el.dataset.item = ""; // сюди буде кидатися item
        el.addEventListener('dragover', e => e.preventDefault());
        el.addEventListener('drop', e => {
            e.preventDefault();
            const data = e.dataTransfer.getData("text/plain");
            el.dataset.item = data; // зберігаємо item у таргеті
            el.textContent = `${targetText} ← ${data}`;
        });
        targetsDiv.appendChild(el);
    });
    container.appendChild(targetsDiv);
}

function checkDragAnswer(box, correctMapping) {
    return [...box.querySelectorAll('.target')].every(t => 
        t.dataset.item && correctMapping[t.dataset.item] === t.textContent.split(' ← ')[0]
    );
}

// ---------------------- RENDER ----------------------
function renderQuestion() {
    const container = document.getElementById("quiz-container");
    container.innerHTML = "";
    if (currentIndex >= quiz.length) return;

    const qData = quiz[currentIndex];
    const div = document.createElement('div');
    div.className = 'question';

    const title = document.createElement('p');
    title.textContent = `${currentIndex + 1}. ${qData.q}`;
    div.appendChild(title);

    currentQuestionObj = createQuestionObj(qData);
    currentQuestionObj.render(div);

    container.appendChild(div);
    toggleButtons();
}

// ---------------------- NAVIGATION ----------------------
function nextQuestion() {
    const box = document.getElementById("quiz-container");
    if (currentQuestionObj) score += currentQuestionObj.check(box) ? 1 : 0;
    currentIndex++;
    renderQuestion();
}

function finishTest() {
    const box = document.getElementById("quiz-container");
    if (currentQuestionObj) score += currentQuestionObj.check(box) ? 1 : 0;
    localStorage.setItem("score", score);
    location.href = "result.html";
}

function loadResults() {
    document.getElementById("r-name").textContent = localStorage.getItem("studentName") || "Не вказано";
    document.getElementById("r-group").textContent = localStorage.getItem("studentGroup") || "Не вказано";
    document.getElementById("r-level").textContent = localStorage.getItem("testLevel") || "Не вказано";
    document.getElementById("r-score").textContent = localStorage.getItem("score") || 0;
}

// ---------------------- BUTTONS ----------------------
function toggleButtons() {
    const isLast = currentIndex === quiz.length - 1;
    document.getElementById("next-btn").style.display = isLast ? "none" : "inline-block";
    document.getElementById("finish-btn").style.display = isLast ? "inline-block" : "none";
}

// ---------------------- UTILS ----------------------
function shuffle(a) { return a.sort(() => Math.random() - 0.5); }
function arraysEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }


// БАНК ПИТАНЬ - DOM: маніпуляції з елементами та атрибутами

// Легкий рівень
const questionsA = [
  { type: "radio", q: "Який метод повертає елемент за id?", answers: ["getElementsByClassName","getElementById","querySelectorAll"], correct: "getElementById" },
  { type: "radio", q: "Як змінити текст всередині елемента?", answers: ["textContent","innerHTML","обидва"], correct: "обидва" },
  { type: "checkbox", q: "Які методи дозволяють видалити елемент з DOM?", answers: ["removeChild","remove"], correct: ["removeChild","remove"] },
  { type: "select", q: "Як додати новий клас до елемента?", answers: ["classList.add('new')","setAttribute('class','new')","appendChild('new')"], correct: "classList.add('new')" },
  { type: "text", q: "Введіть JS-команду, щоб отримати елемент з класом 'box':", correct: "document.getElementsByClassName('box')" },
  { type: "textarea", q: "Напишіть код, щоб створити <div> та додати його у body:", correct: "const div = document.createElement('div'); document.body.appendChild(div);" },
  { type: "fill", q: "Встановіть атрибут data-id у елементі div:", correct: "div.setAttribute('data-id','123');" },
  { type: "radio", q: "Який метод повертає всі елементи за тегом?", answers: ["getElementsByTagName","getElementById","querySelector"], correct: "getElementsByTagName" },
  { type: "checkbox", q: "Методи для отримання або видалення атрибутів:", answers: ["getAttribute","removeAttribute"], correct: ["getAttribute","removeAttribute"] },
  { type: "text", q: "Як змінити фон елемента на червоний?", correct: "element.style.backgroundColor = 'red';" },
  { type: "radio", q: "Який метод повертає перший елемент за CSS-селектором?", answers: ["querySelector","querySelectorAll","getElementsByClassName"], correct: "querySelector" },
  { type: "checkbox", q: "Які методи додають/видаляють CSS-клас?", answers: ["classList.add","classList.remove"], correct: ["classList.add","classList.remove"] },
  { type: "select", q: "Встановити текст елемента на 'Hello':", answers: ["innerHTML='Hello'","textContent='Hello'"], correct: "обидва" },
  { type: "text", q: "Отримати значення атрибуту id елемента:", correct: "element.getAttribute('id');" },
  { type: "fill", q: "Видалити атрибут data-test у елемента div:", correct: "div.removeAttribute('data-test');" }
];

// Середній рівень
const questionsB = [
  { type: "radio", q: "Який метод повертає NodeList всіх елементів за селектором?", answers: ["querySelector","querySelectorAll","getElementsByClassName"], correct: "querySelectorAll" },
  { type: "checkbox", q: "Методи для навігації по DOM:", answers: ["parentNode","children"], correct: ["parentNode","children"] },
  { type: "select", q: "Як вставити новий елемент перед іншим?", answers: ["appendChild","insertBefore","removeChild"], correct: "insertBefore" },
  { type: "text", q: "Створіть текстовий вузол зі значенням 'Hi':", correct: "document.createTextNode('Hi');" },
  { type: "textarea", q: "Додати елемент у кінець батьківського елемента:", correct: "parent.appendChild(element);" },
  { type: "fill", q: "Замінити старий елемент на новий:", correct: "parent.replaceChild(newEl, oldEl);" },
  { type: "radio", q: "Метод, що повертає перший дочірній елемент:", answers: ["firstChild","firstElementChild","обидва"], correct: "firstElementChild" },
  { type: "checkbox", q: "Методи для отримання стилів елемента:", answers: ["element.style","getComputedStyle"], correct: ["element.style","getComputedStyle"] },
  { type: "select", q: "Як видалити елемент з DOM:", answers: ["removeChild","remove"], correct: "обидва" },
  { type: "text", q: "Як отримати наступного сусіднього елемента:", correct: "element.nextElementSibling;" },
  { type: "radio", q: "Що робить element.classList.toggle('active')?", answers: ["Додає клас","Видаляє клас","Перемикає наявність класу"], correct: "Перемикає наявність класу" },
  { type: "checkbox", q: "Методи роботи з атрибутами:", answers: ["setAttribute","getAttribute","removeAttribute"], correct: ["setAttribute","getAttribute","removeAttribute"] },
  { type: "select", q: "Який метод отримує всі дочірні елементи?", answers: ["children","childNodes"], correct: "обидва" },
  { type: "text", q: "Створити <span> та вставити перед <p>:", correct: "parent.insertBefore(span, p);" },
  { type: "fill", q: "Отримати текст з елемента div:", correct: "div.textContent;" }
];

// Складний рівень
const questionsC = [
  { type: "radio", q: "Який метод повертає батьківський елемент?", answers: ["parentNode","children","nextSibling"], correct: "parentNode" },
  { type: "checkbox", q: "Навігаційні властивості DOM:", answers: ["firstChild","lastChild","nextElementSibling"], correct: ["firstChild","lastChild","nextElementSibling"] },
  { type: "select", q: "Вставити новий <li> перед другим елементом списку:", answers: ["parent.insertBefore(newLi, list.children[1]);","appendChild(newLi)","replaceChild(newLi,list.children[1])"], correct: "parent.insertBefore(newLi, list.children[1]);" },
  { type: "text", q: "Створити <div> з класом 'container':", correct: "const div=document.createElement('div'); div.classList.add('container');" },
  { type: "textarea", q: "Замінити HTML-контент елемента на <p>Hello</p>:", correct: "element.innerHTML='<p>Hello</p>';" },
  { type: "fill", q: "Видалити клас 'hidden' у елемента:", correct: "element.classList.remove('hidden');" },
  { type: "radio", q: "Метод, що повертає останнього дочірнього елемента:", answers: ["lastChild","lastElementChild","обидва"], correct: "lastElementChild" },
  { type: "checkbox", q: "Які методи дозволяють отримати обчислені стилі?", answers: ["element.style","getComputedStyle"], correct: ["getComputedStyle"] },
  { type: "select", q: "Як перевірити наявність класу у елемента?", answers: ["classList.contains('active')","getAttribute('class')","innerHTML"], correct: "classList.contains('active')" },
  { type: "text", q: "Встановити атрибут title зі значенням 'Hello':", correct: "element.setAttribute('title','Hello');" },
  { type: "radio", q: "Який метод видаляє елемент з DOM сучасним способом?", answers: ["removeChild","remove"], correct: "remove" },
  { type: "checkbox", q: "Методи для створення та додавання елементів:", answers: ["createElement","createTextNode","appendChild"], correct: ["createElement","createTextNode","appendChild"] },
  { type: "select", q: "Як отримати всі атрибути елемента?", answers: ["getAttribute","attributes","setAttribute"], correct: "attributes" },
  { type: "fill", q: "Отримати id елемента:", correct: "element.getAttribute('id');" },
  { type: "drag", q: "Зіставте методи DOM з їх функцією", items: ["getElementById", "querySelectorAll", "removeChild"], targets: ["Повертає елемент за id", "Повертає NodeList всіх елементів за селектором", "Видаляє дочірній елемент"], correctMapping: {"getElementById": "Повертає елемент за id","querySelectorAll": "Повертає NodeList всіх елементів за селектором","removeChild": "Видаляє дочірній елемент"} }
];