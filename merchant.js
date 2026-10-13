(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  var paymentForm = $("paymentForm");
  var amountInput = $("amount");
  var submitButton = $("submitButton");
  var messageEl = $("message");
  var summaryEl = $("paymentSummary");
  var payAmountEl = $("payAmount");
  var orderStatusText = $("orderStatusText");
  var paymentSection = $("payment");
  var cardPayView = $("cardPayView");
  var cardPayForm = $("cardPayForm");
  var cardPan = $("cardPan");
  var cardExp = $("cardExp");
  var cardCvc = $("cardCvc");
  var cardHolder = $("cardHolderSingle");
  var cardCodeForm = $("cardCodeForm");
  var cardCodeInput = $("cardCodeInput");
  var cardCodeBack = $("cardCodeBack");
  var cardPayBack = $("cardPayBack");

  var TYPES = [
    { label: "VISA", re: /^4/, len: [13, 16, 19], cvc: 3 },
    
  ];

  function digits(s) { return s.replace(/\D/g, ""); }

  function getType(num) {
    var n = digits(num);
    if (!n) return null;
    for (var i = 0; i < TYPES.length; i++) {
      if (TYPES[i].re.test(n)) return TYPES[i];
    }
    return null;
  }

  function luhn(num) {
    var s = digits(num);
    if (s.length < 12) return false;
    var sum = 0, alt = false;
    for (var i = s.length - 1; i >= 0; i--) {
      var d = +s[i];
      if (alt) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  function maskPan(v) {
    var t = getType(v);
    var n = digits(v).slice(0, 19);
    if (t && t.label === "AMEX") {
      n = n.slice(0, 15);
      return [n.slice(0, 4), n.slice(4, 10), n.slice(10, 15)]
        .filter(Boolean).join(" ");
    }
    return n.replace(/(.{4})/g, "$1 ").trim();
  }

  function maskExp(v) {
    var n = digits(v).slice(0, 4);
    return n.length >= 3 ? n.slice(0, 2) + "/" + n.slice(2) : n;
  }

  function formatAmount(v) {
    var clean = v.replace(/[^\d.,]/g, "").replace(".", ",");
    if (!clean) return "";
    var parts = clean.split(",");
    var intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return parts[1] !== undefined ? intPart + "," + parts[1].slice(0, 2) : intPart;
  }

  function toNumber(v) {
    return parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
  }

  function setMessage(text, ok) {
    messageEl.textContent = text || "";
    messageEl.className = "merchant-message" + (ok ? " merchant-message--ok" : "");
  }

  amountInput.addEventListener("input", function () {
    amountInput.value = formatAmount(amountInput.value);
  });

  paymentForm.addEventListener("submit", function (e) {
    e.preventDefault();
    setMessage("");

    var value = toNumber(amountInput.value);
    if (!value || value <= 0) {
      setMessage("Введите сумму");
      amountInput.focus();
      return;
    }
    if (value > 1000000) {
      setMessage("");
      amountInput.focus();
      return;
    }

    payAmountEl.textContent = value.toLocaleString("ru-RU") + " \u20BD";
    summaryEl.hidden = false;
    paymentSection.hidden = false;
    orderStatusText.textContent = "Ожидаем оплату";
    orderStatusText.parentElement.className = "merchant-order-status";

    paymentForm.querySelector(".merchant-btn").hidden = true;
    amountInput.readOnly = true;
  });

  cardPan.addEventListener("input", function () {
    cardPan.value = maskPan(cardPan.value);
  });

  cardExp.addEventListener("input", function () {
    cardExp.value = maskExp(cardExp.value);
  });

  cardCvc.addEventListener("input", function () {
    cardCvc.value = digits(cardCvc.value).slice(0, 4);
  });

  cardPayBack.addEventListener("click", function () {
    paymentSection.hidden = true;
    summaryEl.hidden = true;
    paymentForm.querySelector(".merchant-btn").hidden = false;
    amountInput.readOnly = false;
    setMessage("");
  });

  function validateCard() {
    var num = digits(cardPan.value);
    var t = getType(num);
    var lens = t ? t.len : [16];

    if (!num) return "Введите номер карты";
    if (lens.indexOf(num.length) === -1 || !luhn(num)) return "Неверный номер карты";

    var m = cardExp.value.match(/^(\d{2})\/(\d{2})$/);
    if (!m) return "Срок в формате MM/YY";
    var mm = +m[1], yy = +m[2];
    if (mm < 1 || mm > 12) return "Неверный месяц";
    var now = new Date();
    var cy = now.getFullYear() % 100, cm = now.getMonth() + 1;
    if (yy < cy || (yy === cy && mm < cm)) return "Карта просрочена";

    var need = t ? t.cvc : 3;
    if (!new RegExp("^\\d{" + need + "}$").test(cardCvc.value))
      return "CVC — " + need + " цифры";

    return "";
  }

  cardPayForm.addEventListener("submit", function (e) {
    e.preventDefault();
    setMessage("");

    var err = validateCard();
    if (err) {
      setMessage(err);
      return;
    }

    var btn = cardPayForm.querySelector(".merchant-btn");
    btn.disabled = true;
    btn.textContent = "Отправка...";

    setTimeout(function () {
      btn.disabled = false;
      btn.textContent = "Оплатить картой";
      cardPayForm.hidden = true;
      cardCodeForm.hidden = false;
      orderStatusText.textContent = "Ожидаем подтверждение";
    }, 1100);
  });

  cardCodeBack.addEventListener("click", function () {
    cardCodeForm.hidden = true;
    cardPayForm.hidden = false;
    setMessage("");
  });

  cardCodeInput.addEventListener("input", function () {
    cardCodeInput.value = digits(cardCodeInput.value).slice(0, 6);
  });

  cardCodeForm.addEventListener("submit", function (e) {
    e.preventDefault();
    setMessage("");

    if (cardCodeInput.value.length < 4) {
      setMessage("Введите код из SMS");
      cardCodeInput.focus();
      return;
    }

    var btn = cardCodeForm.querySelector(".merchant-btn");
    btn.disabled = true;
    btn.textContent = "Проверяем...";

    setTimeout(function () {
      btn.disabled = false;
      btn.textContent = "Подтвердить";

      var success = Math.random() < 0.85;

      if (success) {
        orderStatusText.textContent = "Оплачено";
        orderStatusText.parentElement.className = "merchant-order-status merchant-order-status--ok";
        setMessage("Оплата прошла успешно", true);
        cardCodeForm.hidden = true;
        cardPayView.hidden = true;
      } else {
        orderStatusText.textContent = "Отклонено";
        orderStatusText.parentElement.className = "merchant-order-status merchant-order-status--bad";
        setMessage("Банк отклонил операцию. Попробуйте снова.");
        cardCodeInput.value = "";
      }
    }, 1300);
  });
})();