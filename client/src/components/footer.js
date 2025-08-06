import '../imports.js';
const Footer = () => {
  return(
  <footer className='footer-section'>
    <div className='footer-inner-wrap'>
      <div className='grid-cols-3 gap-8 grid w-full'>
        <div className='col-span-2 flex flex-col'>
          <div className=' grid-cols-4 gap-8 grid md-grid-cols-2 mb-12 justify-start'>
            <div className='col-span-2 ct-div-block'>
              <h4 id="heading-h4"className='color-light'>NazServers</h4>
            </div>
          <div className='ct-div-block'>
            
          </div>
            <div className='ct-div-block'>
              <div className='color-light mb-2 font-semibold'>Kontakt</div>
              <a href="mailto:matasmyh@hotmail.no"className='color-light mb-2 hover-color-primary'>matasmyh@hotmail.no</a>
              <a href="tel:97325492"className='mb-2 color-light hover-color-primary'>97325492</a>
            </div>
            </div>
            </div>
            <div className='code-block p-8 color-light'></div>
            </div>
            </div>
  </footer>
  )
}

export default Footer;