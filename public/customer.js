const $ = (id) => document.getElementById(id);
let selectedRoomId = null;

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

function money(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

async function loadRooms() {
  const container = $("roomList");
  try {
    const rooms = await api("/api/rooms");
    if (!rooms.length) {
      container.innerHTML = '<p class="muted">No rooms have been added yet.</p>';
      return;
    }
    container.innerHTML = rooms.map(room => `
      <article class="room-card">
        <div class="room-top">Haven</div>
        <div class="room-info">
          <h3>${escapeHtml(room.RoomType)}</h3>
          <p>Room ${escapeHtml(room.RoomNumber)} · Up to ${room.Capacity} guests</p>
          <p>Status: ${escapeHtml(room.Status)}</p>
          <p class="price">${money(room.PricePerNight)} <small>/ night</small></p>
        </div>
      </article>`).join("");
  } catch (error) {
    container.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
  }
}

async function loadServices() {
  const container = $("serviceList");
  try {
    const services = await api("/api/services");
    const symbols = ["🛎️", "🧺", "🚘", "🧭", "☕"];
    container.innerHTML = services.length ? services.map((service, index) => `
      <article class="service-card">
        <div class="service-icon">${symbols[index % symbols.length]}</div>
        <h3>${escapeHtml(service.ServiceName)}</h3>
        <p>${escapeHtml(service.Description || "Available on request.")}</p>
        <p class="price">${Number(service.Price) === 0 ? "Complimentary" : money(service.Price)}</p>
      </article>`).join("") : '<p class="muted">Services will be listed here soon.</p>';
  } catch (error) {
    container.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

$("checkIn").min = new Date().toISOString().slice(0, 10);
$("checkIn").addEventListener("change", () => {
  $("checkOut").min = $("checkIn").value;
  if ($("checkOut").value && $("checkOut").value <= $("checkIn").value) $("checkOut").value = "";
});

$("searchRooms").addEventListener("click", async () => {
  const checkIn = $("checkIn").value;
  const checkOut = $("checkOut").value;
  const guests = $("guestsCount").value;
  const container = $("availableRooms");
  selectedRoomId = null;
  container.innerHTML = "";
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    container.innerHTML = '<p class="message">Please select a valid check-in and check-out date.</p>';
    return;
  }
  try {
    const rooms = await api(`/api/rooms/available?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}&guests=${guests}`);
    if (!rooms.length) {
      container.innerHTML = '<p class="message">No rooms are available for these dates. Try different dates.</p>';
      return;
    }
    container.innerHTML = "<strong>Choose an available room:</strong>" + rooms.map(room => `
      <label class="room-option">
        <input type="radio" name="selectedRoom" value="${room.room_id}">
        <span><b>${escapeHtml(room.room_type)}</b> · Room ${escapeHtml(room.room_number)} · ${money(room.price_per_night)} / night · Capacity ${room.capacity}</span>
      </label>`).join("");
    container.querySelectorAll('input[name="selectedRoom"]').forEach(radio => {
      radio.addEventListener("change", () => { selectedRoomId = Number(radio.value); });
    });
  } catch (error) {
    container.innerHTML = `<p class="message">${escapeHtml(error.message)}</p>`;
  }
});

$("bookingForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = $("bookingMessage");
  message.textContent = "";
  if (!selectedRoomId) {
    message.textContent = "Please check availability and select a room first.";
    return;
  }
  try {
    const result = await api("/api/reservations", {
      method: "POST",
      body: JSON.stringify({
        fullName: $("guestName").value.trim(),
        email: $("email").value.trim(),
        phone: $("phone").value.trim(),
        checkIn: $("checkIn").value,
        checkOut: $("checkOut").value,
        guests: $("guestsCount").value,
        roomId: selectedRoomId
      })
    });
    const email = $("email").value.trim();
    window.location.href = `/payment.html?reservationId=${result.reservationId}&email=${encodeURIComponent(email)}`;
  } catch (error) {
    message.textContent = error.message;
  }
});

$("lookupForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const resultBox = $("lookupResult");
  resultBox.innerHTML = "";
  const id = $("reservationId").value;
  const email = $("lookupEmail").value.trim();
  try {
    const booking = await api(`/api/my-booking/${encodeURIComponent(id)}?email=${encodeURIComponent(email)}`);
    const canCancel = booking.booking_status === "Confirmed";
    resultBox.innerHTML = `
      <div class="booking-result">
        <h3>Reservation #${booking.reservation_id}</h3>
        <p><b>Guest:</b> ${escapeHtml(booking.full_name)}</p>
        <p><b>Room:</b> ${escapeHtml(booking.room_type)} (Room ${escapeHtml(booking.room_number)})</p>
        <p><b>Dates:</b> ${escapeHtml(booking.check_in)} to ${escapeHtml(booking.check_out)}</p>
        <p><b>Booking status:</b> ${escapeHtml(booking.booking_status)}</p>
        <p><b>Total:</b> ${money(booking.amount)}</p>
        <p><b>Payment:</b> ${escapeHtml(booking.payment_status || "Pending")}</p>
        ${canCancel ? '<button class="cancel-booking-btn" id="cancelBooking">Cancel booking</button>' : ""}
      </div>`;
    const cancelButton = $("cancelBooking");
    if (cancelButton) {
      cancelButton.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to cancel this booking?")) return;
        try {
          const cancelled = await api(`/api/my-booking/${encodeURIComponent(id)}/cancel`, {
            method: "PATCH",
            body: JSON.stringify({ email })
          });
          resultBox.innerHTML = `<div class="booking-result"><p>${escapeHtml(cancelled.message)}</p><p><b>Booking status:</b> Cancelled</p></div>`;
        } catch (error) {
          alert(error.message);
        }
      });
    }
  } catch (error) {
    resultBox.innerHTML = `<p class="message">${escapeHtml(error.message)}</p>`;
  }
});

loadRooms();
loadServices();
