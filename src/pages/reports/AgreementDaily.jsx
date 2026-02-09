import React, { useRef, useState, useEffect } from "react";

export default function DriverAgreement() {
  const contentRef = useRef();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('driverId');
    if (!id) return;
    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
    setLoading(true);
    fetch(`${API_BASE}/api/drivers/${id}`)
      .then(res => { if (!res.ok) throw new Error('Failed to load driver'); return res.json(); })
      .then(d => setDriver(d))
      .catch(err => console.error('Failed to load driver for agreement:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async () => {
    const element = contentRef.current;
    if (!element) return;

    const loadScriptWithTimeout = (src, timeout = 10000) => new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      const timer = setTimeout(() => {
        script.onload = null;
        script.onerror = null;
        reject(new Error('Load timeout'));
      }, timeout);
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = (e) => { clearTimeout(timer); reject(e); };
      document.head.appendChild(script);
    });

    const loadHtml2pdf = async () => {
      if (window.html2pdf) return window.html2pdf;
      const cdns = [
        'https://unpkg.com/html2pdf.js@0.9.3/dist/html2pdf.bundle.min.js',
        'https://cdn.jsdelivr.net/npm/html2pdf.js@0.9.3/dist/html2pdf.bundle.min.js',
        'https://cdn.jsdelivr.net/npm/html2pdf.js@0.9.3/dist/html2pdf.min.js'
      ];
      for (const url of cdns) {
        try {
          await loadScriptWithTimeout(url, 12000);
          if (window.html2pdf) return window.html2pdf;
        } catch (e) {
          console.warn('html2pdf CDN failed:', url, e);
        }
      }
      throw new Error('Failed to load html2pdf.js from all CDNs');
    };

    try {
      const html2pdf = await loadHtml2pdf();
      // avoid visual artefacts and ensure top-of-page capture
      document.body.classList.add('pdf-generating');
      window.scrollTo(0, 0);
      const opt = {
        margin: [10, 10, 10, 10],
        filename: 'Driver_Agreement.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: false, scrollY: -window.scrollY, windowWidth: element.scrollWidth },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };
      try {
        await html2pdf().set(opt).from(element).save();
      } finally {
        document.body.classList.remove('pdf-generating');
      }
    } catch (err) {
      console.warn('html2pdf failed:', err);

      // fallback: try jspdf + html2canvas from CDN
      const loadFallback = async () => {
        try {
          await loadScriptWithTimeout('https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js', 12000);
          await loadScriptWithTimeout('https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js', 12000);
          const html2canvas = window.html2canvas;
          const { jsPDF } = window.jspdf || window.jspdf || {};
          if (!html2canvas || !jsPDF) throw new Error('fallback libs not available');

          const canvas = await html2canvas(element, { scale: 2, useCORS: true, scrollY: -window.scrollY });
          const imgData = canvas.toDataURL('image/jpeg', 0.98);
          const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();

          const imgProps = { width: canvas.width, height: canvas.height };
          const imgWidth = pdfWidth;
          const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

          let heightLeft = imgHeight;
          let position = 0;

          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;

          while (heightLeft > -0.1) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
          }

          pdf.save('Driver_Agreement.pdf');
          return true;
        } catch (fallbackErr) {
          console.error('Fallback PDF generation failed:', fallbackErr);
          return false;
        }
      };

      const ok = await loadFallback();
      if (!ok) {
        alert('PDF download failed. Please check your network or run `npm i html2pdf.js` and reload.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      {/* A4-like page */}

      <div className="mx-auto max-w-[794px] px-2 mb-4 flex justify-end no-print">
        <button onClick={handleDownload} className="bg-blue-600 text-white px-4 py-2 rounded">Download PDF</button>
      </div>

      <style>{`
        .print-area {
          width: 210mm;
          min-height: 297mm;
          padding: 20mm;
          box-sizing: border-box;
          position: relative;
          -webkit-print-color-adjust: exact;
          background: #fff;
          margin: 0 auto;
          overflow: hidden; /* avoid unexpected overflow during rendering */
          box-shadow: none;
        }
        /* watermark - single img placed in DOM instead of pseudo element to avoid CORS/printing issues */
        .print-area .watermark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 0;
          opacity: 0.08;
        }
        .print-area .watermark img { width: 420px; max-width: 70%; height: auto; transform: rotate(-12deg); }
        .print-area .print-content { position: relative; z-index: 10; }

        /* PDF-friendly bullet style: avoid browser-dependent markers and use ::before so html2canvas renders reliably */
        .print-area .print-content ul {
          list-style: none; /* remove default markers */
          padding-left: 1.25rem; /* reserve space for custom marker */
          margin: 0 0 0.75rem 0;
        }
        .print-area .print-content li {
          position: relative;
          padding-left: 0.9rem; /* space for bullet */
          margin-bottom: 0.45rem;
          line-height: 1.45;
          break-inside: avoid;
          page-break-inside: avoid;
          hyphens: auto;
        }
        .print-area .print-content li::before {
          content: '•';
          position: absolute;
          left: 0;
          top: 0.25em;
          color: #111;
          font-weight: 700;
          line-height: 1;
          font-size: 0.9em;
        }

        /* ensure long list items wrap nicely and markers don't float into margins */
        .print-area .print-content p, .print-area .print-content li { word-break: break-word; }

        /* Section spacing and page-break handling: add top spacing (mt-10) for sections so when a section lands at top of a new page it has breathing room. Also avoid breaking inside a section.
           - each > div under .space-y-5 is treated as a section; first child keeps no extra top padding */
        .print-area .print-content .space-y-5 > div {
          page-break-inside: avoid;
          break-inside: avoid;
          padding-top: 2.10rem; /* mt-10 */
        }
        .print-area .print-content .space-y-5 > div:first-child { padding-top: 0; }

        /* typography tweaks for better page flow */
        .print-area .print-content { font-size: 12pt; hyphens: auto; word-wrap: break-word; word-break: break-word; }
        /* remove interactive controls and shadows for printing/PDF */
        @media print { .print-area { box-shadow:none; } .no-print { display:none !important; } }
      `}</style>

      <div ref={contentRef} className="mx-auto print-area bg-white border border-gray-200"> 
        
      <div className="watermark">
        <img src="/WhatsApp Image 2026-01-05 at 5.09.31 PM.jpeg" alt="U DRIVE Watermark" crossOrigin="anonymous" loading="eager" />
      </div>
        <div className="print-content">
            

        {/* Header with small logo and centered title */}
        <div className="relative z-10">
             <img src="/WhatsApp Image 2026-01-05 at 5.09.31 PM.jpeg" alt="U DRIVE Logo" className="h-[70px] w-auto mr-4" crossOrigin="anonymous" />
          <div className="flex items-center justify-center mb-6">
           
            <h1 className="text-center text-2xl font-bold tracking-wide">Driver Agreement - Daily Rental </h1>
          </div>

          <div className="text-sm text-gray-800 z-10">
            <p>
              This Driver Agreement ("Agreement") is made between <span className="font-bold">U DRIVE</span>, hereinafter referred to as the
            </p>
            <p className="mb-3">
             <b> "company"</b> and hereinafter referred to as the <b> "Driver"</b>.
            </p>

            <p>
              <span className="font-bold">U Drive</span>, a company incorporated under the laws of India having its registered office at Unit No 1344,
            </p>
            <p>
              SR Elegance 2<sup>nd</sup> floor, Near Agastya School, Srigandhakaval, Nagarbhavi Bengaluru – 560091, India
            </p>
            <p>
              (hereinafter referred to as the <b> “Company”</b>, which expression shall, unless repugnant to the context,
            </p>
            <p className="mb-3">
              be deemed to include its successors and assigns),
            </p>

            <p className="font-bold mb-3">AND,</p>

            <p className="mb-6">
              The company agrees to grant the Driver access to a <b>CNG vehicle</b> solely for the purpose of providing 
rideshare services - hereinafter referred to as the <b>"Driver"</b>.
            </p>

            {/* Driver KYC */}
            <div className="text-center text-lg font-bold underline mb-6">Driver KYC and Details</div>

            <div className="grid grid-cols-2 gap-x-16 mb-6 z-10 ">
              {/* Left column labels with fill lines */}
              <div className="space-y-4 ">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Date:</span>
                  <span>{driver ? (driver.signedAt ? new Date(driver.signedAt).toISOString().split('T')[0] : (driver.joinDate || new Date().toISOString().split('T')[0])) : ''}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold">Driver Name:</span>
                  <span>{driver?.name || ''}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold">Driving License:</span>
                  <span>{driver?.licenseNumber || ''}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold">Contact Number:</span>
                  <span>{driver?.phone || driver?.mobile || ''}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold">Aadhaar:</span>
                  <span>{driver?.aadharNumber || ''}</span>
                </div>
              </div>

              {/* Right column reference details */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Reference Name 1:</span>
                  <span>{driver?.emergencyContactName || driver?.emergencyContact || ''}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold">Reference Number:</span>
                  <span>{driver?.emergencyPhone || driver?.emergencyPhoneSecondary || ''}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold">Reference Relation:</span>
                  <span>{driver?.emergencyRelation || ''}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold">Reference Name 2:</span>
                  <span>{driver?.emergencyContactSecondary || ''}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold">Reference Number:</span>
                  <span>{driver?.emergencyPhoneSecondary || ''}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold">Reference Relation:</span>
                  <span>{driver?.emergencyRelationSecondary || ''}</span>
                </div>
              </div>
            </div>

            {/* Note */}
            <p className="mb-6 text-sm font-bold">
             Note: Vehicle Registration number is not being mentioned on this agreement since anticipating multiple vehicle swaps would happen month on month
            </p>

            {/* Sections */}
            <div className="space-y-5 ">
              <div>
                <p className="font-bold underline mb-2">Vehicle - Purpose:</p>
                <p>
                  The Driver acknowledges and agrees that the company will deliver the vehicle to driver, to enable the driver to provide driver/Taxi services, the driver here by signing this agreement acknowledges the receiving of CNG vehicle for rider hailing service
                </p>
              </div>

              <div>
                <p className="font-bold underline mb-6">Security Deposit:</p>
               <p>The Driver shall deposit with the company on or before the commencement date, an amount 
specified in the receipt (as the amount of security deposit to be provided by driver) by away of non
interest bearing adjustable security deposit to secure the due performance of the driver services and 
of the terms of this agreement. The Company shall be entitled to adjust against and recover from 
security deposit, any amounts owed by the driver to the company under terms of this agreement 
time to time </p>
              </div>

              <div>
                <p className="font-bold underline mb-2">Refund Policy:</p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>SD (Security Deposit) refund will be processed only <b>after 90 working days</b>.</li>
                  <li className="font-bold">Document and agreement charges of ₹ 1000 would be deducted and total amount would 
be refundable once 90 working days completed which would be credited once resigned </li>
                 <li className="font-bold">If eligible on the above two conditions Amount would be credited on next Friday </li>
                  <li className="font-bold">Performance analysis would be done through daily payment on time which is before         
12 pm any deviation would be considered low performance and Company would have an 
authority to take appropriate action </li>
                </ul>
              </div>

              <div>
                <p className="font-bold underline mb-2">Vehicle Drop:</p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>Need to <b>inform to driver Manager before 2 days of dropping the vehicle</b> back to Udrive office</li>
                  <li>Drop of vehicle post Wednesday rent would be charged for full week</li>
                </ul>
              </div>

              <div>
                <p className="font-bold underline mb-2">Recovery:</p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                 <li className="font-bold">While recovering a vehicle, a fee of Rs 2500/- will be charged.</li>
                  <li><b>Additional charges may apply</b> if any vehicle parts are found missing during the recovery process and legal actions will be taken accordingly.</li>
                <li className="font-bold">Any damages or loss of personal belongings incurred while recovering the vehicle will not
be the responsibility of the company.</li>
                </ul>
              </div>

              <div>
                <p className="font-bold underline mb-2">Accident Responsibility:</p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>The Driver is responsible for any damage caused to third parties and any legal issues resulting from accidents.</li>
                   <li className="font-bold">Any vehicle damages caused by driver, the repair charges should bear by the driver.</li>
                </ul>
              </div>

              <div>
                <p className="font-bold underline mb-2">Traffic Fines:</p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                <li className="font-bold">The Driver is responsible for paying all traffic fines incurred while working.</li>
                </ul>
              </div>

            

              <div>
                <p className="font-bold underline mb-2">Driver Termination:</p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>Driving under the <b>influence of alcohol</b>.</li>
                  <li><b>Handovering vehicle to different driver or friend</b>.</li>
                    <li><b>Driving double driver is not allowed </b>.</li>
                  <li>Driver <b>not responding</b> for more than 48 hours.</li>
                  <li><b>Tampering with the vehicle</b> or its parts, tyres, Spare tyres or Tools.</li>
                  <li><b>Behavioral issues</b> with customers or Driver managers.</li>
                  {/* <li>Performance issues, which will be assessed over a 2-week period.</li> */}
                  <li className="font-bold">Vehicle untidy and uncleanliness.</li>
                <li className="font-bold">Payment pending.</li>
                 <li className="font-bold">Fraud activity </li>
               <li className="font-bold"> Tampering with panic button and GPS.</li>
                </ul>
              </div>

              <div>
                <p className="font-bold underline mb-2">Vehicle Damage:</p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>The <b>Driver is responsible</b> for any <b>physical damage to the vehicle</b> and will bear the <b>associated penalties</b>.</li>
                  <li>Any damages costing more than <b>₹1,000</b> due to accident: <b>50% must be borne by the Driver; remaining will be claimed through insurance</b>. Drivers must inform their DM or U Drive immediately.</li>
                </ul>
              </div>

              <div>
                <p className="font-bold underline mb-2">Vehicle Swap and Drop-off:</p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                <li className="font-bold">Any vehicle swap or drop-off must be arranged on Mondays only.</li>
                </ul>
              </div>

              <div>
                <p className="font-bold underline mb-2">Key Loss:</p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>In the <b>event of key loss</b>, the Driver must pay a fine of<b> 2500 rupees</b>.</li>
                </ul>
              </div>

              <div>
                <p className="font-bold underline mb-2">Vehicle Drop Off:</p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                <li className="font-bold">Vehicle drop-off should occur during office working hours, which are from 10am to 6pm.</li>
                  <li className="font-bold">Vehicle drop-off needs to inform respective driver manager prior to 2 working days.</li>
                </ul>
              </div>

              <div>
                <p className="font-bold underline  mb-2">Payment Process:</p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li className="font-bold">All payments to U DRIVE must be made daily before 12 pm any delay after 12 pm extra 
₹100 need to be paid</li>
              <li className="font-bold">Failure to make the payment more than 48 hrs will result in vehicle recovery & non
refundable of security deposit and recovery charge of 2500/- would be applied based on 
the location charges will be increased </li>
                  
                </ul>
              </div>
 
                

              <div>
                <p className="font-bold underline mb-2">FNF (Full and Final) Pay-out:</p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>All Full and Final (FNF) pay-outs will be processed on Fridays.</li>
                  <li>Information regarding FNF pay-outs must be provided to respective DMs by Wednesday, 4 pm.</li>
                </ul>
              </div>

              <div>
                <p className="font-bold underline mb-2">Dress Code and Safety:</p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                 <li className="font-bold">Drivers must wear a white shirt and seatbelt at all times while driving the vehicle.</li>
                  <li>All traffic rules must be followed and in case of any miss outs driver will be responsible for the fines imposed.</li>
                </ul>
              </div>

              <div>
                <p className="font-bold underline mt-10 mb-2">Penalty:</p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li className="font-bold">Weekly limit of 1800 Km would be provided per week, above which penalty will be 
charged at extra Rs 5/KM.  </li>
                  <li>If the<b> driver wanted sticker is removed flat 1000 RS fine would be applied </b>.</li>
                  <li>If the <b>vehicle is performed intercity for more than 100 KM, the dead KM would be applied 
for both up and down in the following rates: <br></br>
100 km – 150 km = Rs 5/km <br></br>
150 km – 200 km = Rs 10/km <br></br>
Above 200 km = Rs 15/km  </b></li>
                 
                  <li className="font-bold">If the vehicle is recovered due to non-payment or non-compliance situation Security 
deposit will not be refunded </li>
                </ul>
              </div>

            </div>
            <div>
      </div>

            <p className="mt-6 font-bold">
              By signing below, both parties acknowledge and accept the terms and conditions outlined in this agreement.
            </p>

           <div className="mt-8 z-20">
  <div className="pt-6">
  
    <div className="mt-4">
      {driver?.signature ? (
        <div className="flex items-center space-x-4">
             <div>
          <img src={driver.signature} alt="Driver signature" className="h-16 object-contain" />
         
            <div className="font-medium">{driver?.name}</div>
            <div className="text-sm text-gray-600">{driver?.signedAt ? new Date(driver.signedAt).toLocaleString() : (driver?.updatedAt ? new Date(driver.updatedAt).toLocaleString() : '')}</div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500">Not signed</div>
      )}
        <p className="mt-1 font-bold text-sm">Driver's Name & Signature with Date:</p>
    </div>
  </div>

  <div className="pt-20">
    <p className="mt-1 font-bold text-sm">Company Representative's Name & Signature with Date:</p>
 
  </div>
</div>

          </div>
        </div>
      </div>

      </div>  
    </div>
  );
}
