"""
Views for Slack OAuth integration.
"""
import requests
import logging
from django.conf import settings
from django.shortcuts import redirect
from django.http import JsonResponse, HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .models import SlackAccount
from .serializers import SlackAccountSerializer

logger = logging.getLogger('slack_integration')


@api_view(['GET'])
@permission_classes([AllowAny])  # OAuth callback doesn't need authentication
def slack_oauth_callback(request):
    """
    Handle Slack OAuth callback.
    
    Flow:
    1. User clicks "Add to Slack" button
    2. Slack redirects here with a 'code' parameter
    3. Exchange code for access token
    4. Fetch workspace details
    5. Save to slack_accounts table
    6. Return JSON response with success/failure
    
    URL: https://slack.onsync.ai/oauth/callback?code=xxx&state=xxx
    """
    
    # 1. Get the code from Slack's redirect
    code = request.GET.get('code')
    state = request.GET.get('state')  # For CSRF protection
    error = request.GET.get('error')
    
    # Handle authorization denial
    if error:
        logger.error(f"❌ Slack OAuth Error: User denied authorization - {error}")
        return JsonResponse({
            'success': False,
            'error': error,
            'message': 'User denied authorization or authorization failed'
        }, status=400)
    
    if not code:
        logger.error("❌ Slack OAuth Error: No authorization code received from Slack")
        return JsonResponse({
            'success': False,
            'error': 'no_code',
            'message': 'No authorization code received from Slack'
        }, status=400)
    
    try:
        # 2. Exchange code for access token
        logger.info(f"Code Received: {code}")
        logger.info(f"🔄 Exchanging authorization code for access token...")
        token_response = requests.post(
            'https://slack.com/api/oauth.v2.access',
            data={
                'client_id': settings.SLACK_CLIENT_ID,
                'client_secret': settings.SLACK_CLIENT_SECRET,
                'code': code,
                'redirect_uri': settings.SLACK_REDIRECT_URI
            },
            timeout=10
        )
        
        token_data = token_response.json()
        
        if not token_data.get('ok'):
            error_msg = token_data.get('error', 'unknown_error')
            logger.error(f"❌ Slack OAuth token exchange failed: {error_msg}")
            logger.error(f"   Full response: {token_data}")
            return JsonResponse({
                'success': False,
                'error': error_msg,
                'message': f'Failed to exchange code for token: {error_msg}'
            }, status=400)
        
        # 3. Extract data from OAuth response
        access_token = token_data.get('access_token')
        bot_user_id = token_data.get('bot_user_id')
        team_info = token_data.get('team', {})
        workspace_id = team_info.get('id')
        workspace_name = team_info.get('name')
        authed_user = token_data.get('authed_user', {})
        
        logger.info(f"✅ Successfully obtained access token")
        logger.info(f"   Workspace: {workspace_name} ({workspace_id})")
        logger.info(f"   Bot User ID: {bot_user_id}")
        logger.info(f"   Authorized User: {authed_user.get('id', 'N/A')}")
        
        if not all([access_token, workspace_id, workspace_name]):
            logger.error(f"❌ Missing required data in Slack OAuth response")
            logger.error(f"   Access Token: {'Present' if access_token else 'Missing'}")
            logger.error(f"   Workspace ID: {workspace_id or 'Missing'}")
            logger.error(f"   Workspace Name: {workspace_name or 'Missing'}")
            return JsonResponse({
                'success': False,
                'error': 'missing_data',
                'message': 'Incomplete data received from Slack OAuth'
            }, status=400)
        
        # 4. Fetch workspace URL using team.info API
        logger.info(f"🔄 Fetching additional workspace details...")
        team_info_response = requests.get(
            'https://slack.com/api/team.info',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10
        )
        
        team_info_data = team_info_response.json()
        workspace_url = None
        
        if team_info_data.get('ok'):
            domain = team_info_data.get('team', {}).get('domain')
            if domain:
                workspace_url = f"{domain}.slack.com"
                logger.info(f"   Workspace URL: {workspace_url}")
        else:
            logger.warning(f"⚠️  Could not fetch team.info: {team_info_data.get('error')}")
            logger.warning(f"   Continuing without workspace URL")
        
        # 5. Get client_account_id from state or query parameter
        client_account_id = None
        
        # Try to extract from state parameter
        if state and state.startswith('account_'):
            try:
                client_account_id = int(state.replace('account_', ''))
                logger.info(f"   Client Account ID from state: {client_account_id}")
            except ValueError:
                logger.warning(f"⚠️  Invalid account_id in state: {state}")
        
        # Fallback to query parameter
        if not client_account_id:
            account_id_param = request.GET.get('account_id')
            if account_id_param:
                try:
                    client_account_id = int(account_id_param)
                    logger.info(f"   Client Account ID from query: {client_account_id}")
                except ValueError:
                    logger.warning(f"⚠️  Invalid account_id parameter: {account_id_param}")
        
        # Default to account 1 if not specified
        if not client_account_id:
            client_account_id = 1
            logger.warning(f"⚠️  No account_id specified, defaulting to: {client_account_id}")
        
        # 6. Save to slack_accounts table
        logger.info(f"💾 Saving Slack account to database...")
        slack_account, created = SlackAccount.objects.update_or_create(
            workspace_id=workspace_id,
            defaults={
                'workspace_name': workspace_name,
                'workspace_url': workspace_url,
                'slack_access_token': access_token,
                'onsync_bot_user_id': bot_user_id,
                'client_account_id': client_account_id,
            }
        )
        
        action = "created" if created else "updated"
        logger.info(f"✅ Slack account {action} successfully!")
        logger.info(f"   Workspace ID: {workspace_id}")
        logger.info(f"   Workspace Name: {workspace_name}")
        logger.info(f"   Workspace URL: {workspace_url or 'N/A'}")
        logger.info(f"   Bot User ID: {bot_user_id or 'N/A'}")
        logger.info(f"   Client Account: {client_account_id}")
        logger.info(f"   Action: {action.upper()}")
        
        # 7. Return success response
        return JsonResponse({
            'success': True,
            'action': action,
            'data': {
                'workspace_id': workspace_id,
                'workspace_name': workspace_name,
                'workspace_url': workspace_url,
                'bot_user_id': bot_user_id,
                'client_account_id': client_account_id
            },
            'message': f'Slack workspace "{workspace_name}" {action} successfully'
        }, status=201 if created else 200)
        
    except requests.RequestException as e:
        logger.error(f"❌ Network error during Slack OAuth: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'network_error',
            'message': f'Network error while communicating with Slack: {str(e)}'
        }, status=500)
    
    except Exception as e:
        logger.error(f"❌ Unexpected error during Slack OAuth: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'server_error',
            'message': f'An unexpected error occurred: {str(e)}'
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def slack_oauth_install(request):
    """
    Redirect users to Slack's authorization page.
    
    Optional query parameters:
    - account_id: The client account ID to associate with this Slack workspace
    
    URL: https://slack.onsync.ai/oauth/install?account_id=1
    """
    account_id = request.GET.get('account_id', '')
    
    logger.info(f"🚀 Starting Slack OAuth flow")
    if account_id:
        logger.info(f" Client Account ID: {account_id}")
    
    # Build Slack authorization URL
    slack_auth_url = (
        f"https://slack.com/oauth/v2/authorize"
        f"?client_id={settings.SLACK_CLIENT_ID}"
        f"&scope=app_mentions:read"
        f"&user_scope=channels:history,channels:read,channels:write,channels:write.invites,channels:write.topic,chat:write,groups:history,groups:read,groups:write,groups:write.invites,groups:write.topic,users:read,users:read.email,users:write,files:write,im:write,im:history,im:read,im:write.topic,files:read"
        f"&redirect_uri={settings.SLACK_REDIRECT_URI}"
    )
    
    # Add state parameter for account tracking
    if account_id:
        slack_auth_url += f"&state=account_{account_id}"
    
    logger.info(f"   Redirecting to Slack authorization page")
    return redirect(slack_auth_url)


@api_view(['GET'])
def list_slack_accounts(request):
    """
    List all Slack accounts for the authenticated user's account.
    
    Optional filters:
    - account_id: Filter by client account
    """
    account_id = request.query_params.get('account_id')
    
    logger.info(f"📋 Listing Slack accounts")
    if account_id:
        logger.info(f"   Filtered by account_id: {account_id}")
    
    queryset = SlackAccount.objects.all()
    
    if account_id:
        queryset = queryset.filter(client_account_id=account_id)
    
    logger.info(f"   Found {queryset.count()} Slack account(s)")
    
    serializer = SlackAccountSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['DELETE'])
def disconnect_slack_account(request, workspace_id):
    """
    Disconnect/delete a Slack account.
    """
    logger.info(f"🗑️  Attempting to disconnect Slack workspace: {workspace_id}")
    
    try:
        slack_account = SlackAccount.objects.get(workspace_id=workspace_id)
        workspace_name = slack_account.workspace_name
        
        slack_account.delete()
        
        logger.info(f"✅ Slack workspace disconnected successfully")
        logger.info(f"   Workspace ID: {workspace_id}")
        logger.info(f"   Workspace Name: {workspace_name}")
        
        return Response(
            {
                "success": True,
                "detail": f"Slack workspace '{workspace_name}' ({workspace_id}) disconnected successfully"
            },
            status=status.HTTP_200_OK
        )
    except SlackAccount.DoesNotExist:
        logger.warning(f"⚠️  Slack workspace not found: {workspace_id}")
        return Response(
            {
                "success": False,
                "detail": f"Slack workspace {workspace_id} not found"
            },
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def slack_oauth_test(request):
    """
    Test endpoint to verify Slack OAuth configuration.
    """
    logger.info(f"🔍 Testing Slack OAuth configuration")
    
    client_id_configured = bool(getattr(settings, 'SLACK_CLIENT_ID', None))
    client_secret_configured = bool(getattr(settings, 'SLACK_CLIENT_SECRET', None))
    redirect_uri = getattr(settings, 'SLACK_REDIRECT_URI', None)
    
    logger.info(f"   Client ID configured: {client_id_configured}")
    logger.info(f"   Client Secret configured: {client_secret_configured}")
    logger.info(f"   Redirect URI: {redirect_uri}")
    
    config_status = {
        'client_id_configured': client_id_configured,
        'client_secret_configured': client_secret_configured,
        'redirect_uri': redirect_uri,
    }
    
    return Response(config_status)
