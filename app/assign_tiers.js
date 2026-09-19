import Database from 'better-sqlite3';

function assignTiers() {
  const db = new Database('data/recruiter.db');
  
  // Tier 1 to 8: Exact/partial Company Matching
  const companyTiers = [
    { tier: 1, keywords: ['Google', 'Microsoft', 'Apple', 'Meta'] },
    { tier: 2, keywords: ['Oracle', 'Amazon', 'NVIDIA', 'Qualcomm', 'AMD', 'Micron'] },
    { tier: 3, keywords: ['Salesforce', 'Walmart Global Tech', 'Intuit', 'Cisco', 'Siemens', 'SAP', 'Walmart'] },
    { tier: 4, keywords: ['PhonePe', 'Razorpay', 'Whatfix', 'Paytm', 'Meesho', 'Swiggy', 'Flipkart'] },
    { tier: 5, keywords: ['Uber', 'LinkedIn', 'Adobe', 'IBM', 'Dell', 'Nokia', 'Honeywell', 'Bosch', 'Thomson Reuters'] },
    { tier: 6, keywords: ['Mindtickle', 'Gupshup', 'Uniphore', 'Headout', 'Zenoti', 'Urban Company', 'Bizongo', 'Yodlee'] },
    { tier: 7, keywords: ['Accenture', 'Deloitte', 'Wipro', 'Infosys', 'TCS', 'Cognizant', 'Capgemini', 'Mphasis', 'Genpact'] },
    { tier: 8, keywords: ['CGI', 'Tech Mahindra', 'Sonata Software', 'Happiest Minds', 'Informatica', 'GreyOrange', 'Replicon'] },
  ];

  const contacts = db.prepare('SELECT id, name, company, job_title FROM contacts').all();
  
  let stats = { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0, 13:0, 14:0 };

  const updateTier = db.prepare('UPDATE contacts SET tier = ? WHERE id = ?');

  db.transaction(() => {
    for (const c of contacts) {
      let assignedTier = 9; // Default to Tier 9 (Remaining recruiters)
      const company = (c.company || '').toLowerCase();
      const title = (c.job_title || '').toLowerCase();
      const name = (c.name || '').toLowerCase();

      // Check Garbage (14)
      if (['valid', 'in', 'gmail', 'not mentioned'].includes(company) || name.includes('?') || company.includes('?')) {
        assignedTier = 14;
      } 
      // Check Generic (13)
      else if (!title || ['—', 'general', 'contact', 'unknown'].includes(title)) {
        assignedTier = 13;
      }
      // Check Founders (12)
      else if (title.includes('founder') || title.includes('ceo') || title.includes('chief executive')) {
        assignedTier = 12;
      }
      // Check Engineering (10)
      else if (title.includes('engineer') || title.includes('sde') || title.includes('developer') || title.match(/\bengg\b/)) {
        assignedTier = 10;
      }
      // Check HR/General non-recruiting (11)
      else if ((title.includes('hr') || title.includes('people') || title.includes('human resources')) && 
               !title.includes('recruit') && !title.includes('talent')) {
        assignedTier = 11;
      }

      // Check Companies (1-8) - This OVERRIDES role-based for 1-8 if a match is found
      for (const t of companyTiers) {
        if (t.keywords.some(k => company.includes(k.toLowerCase()))) {
          assignedTier = t.tier;
          break; // Stop at highest priority company match
        }
      }

      updateTier.run(assignedTier, c.id);
      stats[assignedTier]++;
    }
  })();

  console.log('Tier Assignment Complete. Stats:');
  console.log(stats);
}

assignTiers();
