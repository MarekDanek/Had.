 <script>
    import { onMount, onDestroy } from "svelte";
  
    let canvas;
    let ctx;
    let had = [{ x: 5, y: 5 }];
    let smerX = 1;
    let smerY = 0;
    let velikostHada = 20;
    let jidlo = { x: 10, y: 10 };
    let pocetJidla = 0;
    let zbyvajiciJidlo = 10;
  
    function resetHry() {
      had = [{ x: 5, y: 5 }];
      novaPoziceJidla();
      smerX = 1;
      smerY = 0;
    }
      
    function novaPoziceJidla(){
         jidlo.x = Math.floor(Math.random() * (canvas.width / velikostHada));
         jidlo.y = Math.floor(Math.random() * (canvas.height / velikostHada));
    }
   
  
    function Kolize() {
      if (had[0].x < 0 || had[0].x >= canvas.width / velikostHada || had[0].y < 0 || had[0].y >= canvas.height / velikostHada) {
        alert('KONEC HRY :(, NARAZIL JSI DO ZDI. --> MOC TO NEUMÍŠ');
        resetHry();
        location.reload();
      }
    
  
      for (let i = 1; i < had.length; i++) {
        if (had[0].x === had[i].x && had[0].y === had[i].y) {
          alert('KONEC HRY :(, NARAZIL SI SÁM DO SEBE. --> MOC TO NEUMÍŠ');
          resetHry();
          location.reload();
        }
      }
  
      if (had[0].x === jidlo.x && had[0].y === jidlo.y) {
        had.push({});
        novaPoziceJidla();
        pocetJidla += 1;
        zbyvajiciJidlo -= 1;

        if(pocetJidla == 10 || zbyvajiciJidlo == 0){
            alert('VYHRÁL JSI:). --> JSI ŠIKULKA')
            resetHry();
            location.reload();
        }
        
      }
    }
  

    function updateHada() {
      let hlava = { x: had[0].x + smerX, y: had[0].y + smerY };
      had.unshift(hlava);
  
      Kolize();
      had.pop();
  
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'blue';
      had.forEach((cast) => {
        ctx.fillRect(cast.x * velikostHada, cast.y * velikostHada, velikostHada, velikostHada);
      });
  
      ctx.fillStyle = 'green';
      ctx.fillRect(jidlo.x * velikostHada, jidlo.y * velikostHada, velikostHada, velikostHada);
    }

  
    onMount(() => {
      ctx = canvas.getContext("2d");
      novaPoziceJidla();
      
      
      const hraInterval = setInterval(updateHada, 50);

      window.addEventListener("keydown", (event) => {
        switch (event.key) {
          case "ArrowUp":
            smerX = 0;
            smerY = -1;
            break;
          case "ArrowDown":
            smerX = 0;
            smerY = 1;
            break;
          case "ArrowLeft":
            smerX = -1;
            smerY = 0;
            break;
          case "ArrowRight":
            smerX = 1;
            smerY = 0;
            break;
        }
      });
    
  
      
      onDestroy(() => {
        window.removeEventListener("keydown", null);
        clearInterval(hraInterval);
      });
    });

  </script>
  
  <h1 style="text-align: center;">Had</h1>

  <div class="divCanvas">
    <canvas bind:this={canvas} width="400" height="400" style="border: 3px solid black; background-color: lightgray"></canvas>
  </div>

  <div style="text-align: center;font-size:larger">
    <p><b>Počet snězeného jidla: {pocetJidla}</b></p>

    <p><b>Musíš sníst {zbyvajiciJidlo} jídla abys vyhrál.</b></p>  
  </div>

 
  
  <style>
    .divCanvas {
      text-align: center;
    }
  </style>
  