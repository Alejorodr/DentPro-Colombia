const year = document.getElementById("year"); if (year) year.textContent = new Date().getFullYear();
const darkToggle = document.getElementById("darkModeToggle");
if (darkToggle) { darkToggle.addEventListener("click", () => document.documentElement.classList.toggle("light")); }
(function(){
  const track = document.getElementById("specialistsTrack"); if (!track) return;
  let idx = 0;
  const cards = track.querySelectorAll(".card"); if (!cards.length) return;
  const dots = Array.from(document.querySelectorAll(".dot"));
  function go(i){ idx = (i+cards.length)%cards.length; track.style.transform = `translateX(${-idx*(cards[0].clientWidth+16)}px)`; dots.forEach((d,j)=>d.classList.toggle("active", j===idx)); }
  document.getElementById("prevSpec")?.addEventListener("click",()=>go(idx-1));
  document.getElementById("nextSpec")?.addEventListener("click",()=>go(idx+1));
  go(0);
})();
document.getElementById("bookingForm")?.addEventListener("submit", (e)=>{
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  alert(`Turno solicitado para ${data.name || "paciente"} — ${data.date || ""} ${data.time || ""}`);
});
