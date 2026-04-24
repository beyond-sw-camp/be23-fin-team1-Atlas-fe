const users = [
  {userPublicId: '01KPWM6P9D4B666B0B6G9J2HNB', organizationPublicId: '01KPWM5N9KH0WCH2GE5BJ0AS32', loginId: 'admin@cho', firstName: '강현', middleName: ''},
  {userPublicId: '01KPSSJBWMS1QRNCKQCMGNSB54', organizationPublicId: '01KPSSH384CXXGGWR51E6KX4QQ', loginId: 'admin@iamxoghks', firstName: '태환', middleName: ''}
];

const availableUsers = users.map((user) => {
  const lastName = String(user.lastName || user.last_name || '').replace(/null|undefined/gi, '').trim()
  const firstName = String(user.firstName || user.first_name || '').replace(/null|undefined/gi, '').trim()
  let displayName = `${lastName}${firstName}`.trim()
  
  if (!displayName) {
    const possibleNames = [
      user.name, user.userName, user.user_name, 
      user.nickname, user.realName, user.real_name,
      user.loginId, user.login_id, user.email
    ]
    for (const n of possibleNames) {
      const val = String(n || '').replace(/null|undefined/gi, '').trim()
      if (val) {
        displayName = val
        break
      }
    }
    if (!displayName) {
      displayName = '이름 없음'
    }
  }
  const jobTitle = user.jobTitle || user.job_title || ''
  return {
    userPublicId: user.userPublicId || user.user_public_id || user.publicId || user.public_id || user.id,
    displayName,
    jobTitle,
  }
});

console.log(availableUsers);
