const fs = require('fs');
let content = fs.readFileSync('src/components/WeeklyReportModal.tsx', 'utf-8');

// The issue is probably too many or too few `</div>` tags.
// Let's replace the problematic area.
// from: 
//                  </div>
//                </div>
//                </div>
//             </div>
// to:
//                  </div>
//                </div>
//             </div>
content = content.replace(
`                  </div>
               </div>
               </div>
            </div>`,
`                  </div>
               </div>
            </div>`
);

fs.writeFileSync('src/components/WeeklyReportModal.tsx', content);

