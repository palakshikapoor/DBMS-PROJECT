const $ = (id) => document.getElementById(id);
const message = $("adminMessage");
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function money(value) {
  return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(value||0));
}
async function api(url, options={}) {
  const response = await fetch(url,{headers:{"Content-Type":"application/json"},...options});
  const data = await response.json().catch(()=>({}));
  if(response.status===401){window.location.href="/admin-login";throw new Error("Admin session expired.");}
  if(!response.ok)throw new Error(data.message||"Request failed.");
  return data;
}
async function loadDashboard(){
  const d=await api("/api/dashboard");
  $("totalRooms").textContent=d.rooms;$("totalGuests").textContent=d.guests;
  $("totalReservations").textContent=d.reservations;$("pendingPayments").textContent=d.pendingPayments;
}
async function loadReservations(){
  const rows=await api("/api/reservations");
  $("reservationsBody").innerHTML=rows.map(r=>`<tr>
    <td>${r.ReservationID}</td><td>${escapeHtml(r.GuestName)}<br><small>${escapeHtml(r.Email)}</small></td>
    <td>${escapeHtml(r.RoomType)} (${escapeHtml(r.RoomNumber)})</td><td>${escapeHtml(r.CheckIn)} → ${escapeHtml(r.CheckOut)}</td>
    <td>${money(r.Amount)}</td><td>${escapeHtml(r.BookingStatus)}</td><td>${escapeHtml(r.PaymentStatus||"Pending")}</td>
    <td><select data-reservation="${r.ReservationID}"><option ${r.BookingStatus==="Confirmed"?"selected":""}>Confirmed</option><option ${r.BookingStatus==="Checked In"?"selected":""}>Checked In</option><option ${r.BookingStatus==="Checked Out"?"selected":""}>Checked Out</option><option ${r.BookingStatus==="Cancelled"?"selected":""}>Cancelled</option></select></td>
  </tr>`).join("");
}
async function loadRooms(){
  const rows=await api("/api/rooms");
  $("roomsBody").innerHTML=rows.map(r=>`<tr><td>${r.RoomID}</td><td>${escapeHtml(r.RoomNumber)}</td><td>${escapeHtml(r.RoomType)}</td><td>${money(r.PricePerNight)}</td><td>${r.Capacity}</td><td>${escapeHtml(r.Status)}</td><td><select data-room="${r.RoomID}"><option ${r.Status==="Available"?"selected":""}>Available</option><option ${r.Status==="Maintenance"?"selected":""}>Maintenance</option><option ${r.Status==="Unavailable"?"selected":""}>Unavailable</option></select></td></tr>`).join("");
}
async function loadServices(){
  const rows=await api("/api/services");
  $("servicesBody").innerHTML=rows.map(s=>`<tr><td>${s.ServiceID}</td><td>${escapeHtml(s.ServiceName)}</td><td>${escapeHtml(s.Description)}</td><td>${money(s.Price)}</td></tr>`).join("");
}
async function loadPayments(){
  const rows=await api("/api/payments");
  $("paymentsBody").innerHTML=rows.map(p=>`<tr><td>${p.PaymentID}</td><td>${p.ReservationID}</td><td>${escapeHtml(p.GuestName)}<br><small>${escapeHtml(p.Email)}</small></td><td>${money(p.Amount)}</td><td>${escapeHtml(p.PaymentMethod)}</td><td>${escapeHtml(p.PaymentStatus)}</td><td><select data-payment="${p.PaymentID}"><option ${p.PaymentStatus==="Pending"?"selected":""}>Pending</option><option ${p.PaymentStatus==="Paid"?"selected":""}>Paid</option><option ${p.PaymentStatus==="Refunded"?"selected":""}>Refunded</option></select></td></tr>`).join("");
}
async function loadGuests(){
  const rows=await api("/api/guests");
  $("guestsBody").innerHTML=rows.map(g=>`<tr><td>${g.GuestID}</td><td>${escapeHtml(g.FullName)}</td><td>${escapeHtml(g.Email)}</td><td>${escapeHtml(g.Phone)}</td></tr>`).join("");
}
async function refreshAll(){
  try{await Promise.all([loadDashboard(),loadReservations(),loadRooms(),loadServices(),loadPayments(),loadGuests()]);}
  catch(e){message.textContent=e.message;}
}
document.addEventListener("change",async(event)=>{
  try{
    if(event.target.dataset.reservation){
      await api(`/api/reservations/${event.target.dataset.reservation}/status`,{method:"PATCH",body:JSON.stringify({status:event.target.value})});
      message.textContent="Reservation status updated.";await refreshAll();
    }
    if(event.target.dataset.room){
      await api(`/api/rooms/${event.target.dataset.room}/status`,{method:"PATCH",body:JSON.stringify({status:event.target.value})});
      message.textContent="Room status updated.";await loadRooms();await loadDashboard();
    }
    if(event.target.dataset.payment){
      await api(`/api/payments/${event.target.dataset.payment}`,{method:"PATCH",body:JSON.stringify({status:event.target.value})});
      message.textContent="Payment status updated.";await loadPayments();await loadDashboard();
    }
  }catch(e){message.textContent=e.message;}
});
$("roomForm").addEventListener("submit",async(e)=>{
  e.preventDefault();
  try{
    await api("/api/rooms",{method:"POST",body:JSON.stringify({roomNumber:$("roomNumber").value,roomType:$("roomType").value,pricePerNight:$("roomPrice").value,capacity:$("roomCapacity").value})});
    e.target.reset();message.textContent="Room added.";await loadRooms();await loadDashboard();
  }catch(err){message.textContent=err.message;}
});
$("serviceForm").addEventListener("submit",async(e)=>{
  e.preventDefault();
  try{
    await api("/api/services",{method:"POST",body:JSON.stringify({serviceName:$("serviceName").value,description:$("serviceDescription").value,servicePrice:$("servicePrice").value})});
    e.target.reset();message.textContent="Service added.";await loadServices();
  }catch(err){message.textContent=err.message;}
});
document.querySelectorAll("[data-load]").forEach(button=>button.addEventListener("click",()=>{
  const fn={reservations:loadReservations,payments:loadPayments,guests:loadGuests}[button.dataset.load];if(fn)fn().catch(e=>message.textContent=e.message);
}));
$("logoutButton").addEventListener("click",async()=>{
  await fetch("/api/logout",{method:"POST"});window.location.href="/admin-login";
});
refreshAll();
