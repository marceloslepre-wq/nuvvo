routerAdd('POST', '/backend/v1/track', (e) => {
  const body = e.requestInfo().body || {}

  // 1. Ignorar visitas internas (referrer goskip.dev)
  const referrer = typeof body.referrer === 'string' ? body.referrer : ''
  if (referrer && referrer.includes('goskip.dev')) {
    return e.json(204, { ok: true, ignored: true })
  }

  // 2. Ignorar robôs conhecidos (User-Agent header)
  const userAgent = (e.request.header.get('User-Agent') || '').toLowerCase()
  const botKeywords = [
    'bot',
    'crawler',
    'spider',
    'googlebot',
    'adsbot',
    'mediapartners-google',
    'google-inspectiontool',
    'googleother',
    'lighthouse',
    'headlesschrome',
    'facebookexternalhit',
    'bingpreview',
    'slurp',
  ]
  for (let i = 0; i < botKeywords.length; i++) {
    if (userAgent.includes(botKeywords[i])) {
      return e.json(204, { ok: true, ignored: true })
    }
  }

  const remoteAddr = e.request.remoteAddr || ''
  let ip = ''
  const xff = e.request.header.get('X-Forwarded-For') || ''
  if (xff) {
    ip = xff.split(',')[0].trim()
  } else if (remoteAddr) {
    const parts = remoteAddr.split(':')
    if (parts.length === 2) {
      ip = parts[0]
    } else {
      ip = remoteAddr
    }
  }

  let ipHash = ''
  if (ip) {
    ipHash = $security.sha256(ip)
  }

  let country = ''
  let region = ''
  let city = ''
  if (ip) {
    try {
      const res = $http.send({
        url: 'http://ip-api.com/json/' + ip + '?fields=status,country,regionName,city',
        method: 'GET',
        timeout: 5,
      })
      if (res.statusCode === 200 && res.json && res.json.status === 'success') {
        country = res.json.country || ''
        region = res.json.regionName || ''
        city = res.json.city || ''
      }
    } catch (_) {}
  }

  const validTypes = ['pageview', 'click']
  const validModalities = ['direct', 'organic', 'social', 'referral', 'paid', 'unknown']
  const validDevices = ['mobile', 'desktop', 'tablet']

  const collection = $app.findCollectionByNameOrId('visit_logs')
  const record = new Record(collection)
  if (body.tenant_id && typeof body.tenant_id === 'string') {
    record.set('tenant', body.tenant_id)
  }
  record.set('type', validTypes.includes(body.type) ? body.type : 'pageview')
  record.set('modality', validModalities.includes(body.modality) ? body.modality : 'unknown')
  record.set('source', typeof body.source === 'string' ? body.source : '')
  record.set('device', validDevices.includes(body.device) ? body.device : '')
  record.set('browser', typeof body.browser === 'string' ? body.browser : '')
  record.set('os', typeof body.os === 'string' ? body.os : '')
  record.set('ip', ip)
  record.set('country', country)
  record.set('region', region)
  record.set('city', city)
  record.set('ip_hash', ipHash)
  record.set('referrer', typeof body.referrer === 'string' ? body.referrer : '')
  record.set('path', typeof body.path === 'string' ? body.path : '')
  record.set('session_id', typeof body.session_id === 'string' ? body.session_id : '')

  try {
    $app.save(record)
  } catch (err) {
    $app.logger().error('track_visit save failed', 'error', String(err))
    return e.json(500, { ok: false })
  }

  return e.json(201, { ok: true })
})
