import { FeatureFlag } from '@crowd/types'
import Permissions from '../../security/permissions'
import MemberService from '../../services/memberService'
import PermissionChecker from '../../services/user/permissionChecker'
import isFeatureEnabled from '../../feature-flags/isFeatureEnabled'

/**
 * GET /tenant/{tenantId}/member/{id}
 * @summary Find a member
 * @tag Members
 * @security Bearer
 * @description Find a single member by ID.
 * @pathParam {string} tenantId - Your workspace/tenant ID
 * @pathParam {string} id - The ID of the member
 * @response 200 - Ok
 * @responseContent {MemberResponse} 200.application/json
 * @responseExample {MemberFind} 200.application/json.Member
 * @response 401 - Unauthorized
 * @response 404 - Not found
 * @response 429 - Too many requests
 */
export default async (req, res) => {
  new PermissionChecker(req).validateHas(Permissions.values.memberRead)

  const segmentId = req.query.segments?.length > 0 ? req.query.segments[0] : null
  if (!segmentId) {
    const segmentsEnabled = await isFeatureEnabled(FeatureFlag.SEGMENTS, req)
    if (segmentsEnabled) {
      await req.responseHandler.error(req, res, {
        code: 400,
        message: 'Segment ID is required',
      })
      return
    }
  }

  let payload
  if (await isFeatureEnabled(FeatureFlag.SERVE_PROFILES_OPENSEARCH, req)) {
    payload = await new MemberService(req).findByIdOpensearch(req.params.id, segmentId)
    // temp flag to notifiy the client that this is an opensearch response
    payload.fromOpensearch = true
  } else {
    payload = await new MemberService(req).findById(req.params.id, true, true, segmentId)
  }

  await req.responseHandler.success(req, res, payload)
}
