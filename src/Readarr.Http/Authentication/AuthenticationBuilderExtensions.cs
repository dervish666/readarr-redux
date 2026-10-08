using System;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Diacritical;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.DependencyInjection;
using NzbDrone.Core.Authentication;
using NzbDrone.Core.Configuration;

namespace Readarr.Http.Authentication
{
    public static class AuthenticationBuilderExtensions
    {
        private static readonly Regex CookieNameRegex = new Regex(@"[^a-z0-9]+", RegexOptions.Compiled | RegexOptions.IgnoreCase);

        public static AuthenticationBuilder AddApiKey(this AuthenticationBuilder authenticationBuilder, string name, Action<ApiKeyAuthenticationOptions> options)
        {
            return authenticationBuilder.AddScheme<ApiKeyAuthenticationOptions, ApiKeyAuthenticationHandler>(name, options);
        }

        public static AuthenticationBuilder AddBasic(this AuthenticationBuilder authenticationBuilder, string name)
        {
            return authenticationBuilder.AddScheme<AuthenticationSchemeOptions, BasicAuthenticationHandler>(name, options => { });
        }

        public static AuthenticationBuilder AddNone(this AuthenticationBuilder authenticationBuilder, string name)
        {
            return authenticationBuilder.AddScheme<AuthenticationSchemeOptions, NoAuthenticationHandler>(name, options => { });
        }

        public static AuthenticationBuilder AddExternal(this AuthenticationBuilder authenticationBuilder, string name)
        {
            return authenticationBuilder.AddScheme<AuthenticationSchemeOptions, NoAuthenticationHandler>(name, options => { });
        }

        public static AuthenticationBuilder AddAppAuthentication(this IServiceCollection services)
        {
            services.AddOptions<CookieAuthenticationOptions>(AuthenticationType.Forms.ToString())
                .Configure<IConfigFileProvider>((options, configFileProvider) =>
                {
                    // Replace diacritics and replace non-word characters to ensure cookie name doesn't contain any valid URL characters not allowed in cookie names
                    var instanceName = configFileProvider.InstanceName;
                    instanceName = instanceName.RemoveDiacritics();
                    instanceName = CookieNameRegex.Replace(instanceName, string.Empty);

                    options.Cookie.Name = $"{instanceName}Auth";
                    options.AccessDeniedPath = "/login?loginFailed=true";
                    options.LoginPath = "/login";
                    options.ExpireTimeSpan = TimeSpan.FromDays(7);
                    options.SlidingExpiration = true;
                    options.ReturnUrlParameter = "returnUrl";
                    options.Events.OnValidatePrincipal = ValidateSession;
                });

            return services.AddAuthentication()
                .AddNone(AuthenticationType.None.ToString())
                .AddExternal(AuthenticationType.External.ToString())
                .AddBasic(AuthenticationType.Basic.ToString())
                .AddCookie(AuthenticationType.Forms.ToString())
                .AddApiKey("API", options =>
                {
                    options.HeaderName = "X-Api-Key";
                    options.QueryName = "apikey";
                })
                .AddApiKey("SignalR", options =>
                {
                    options.HeaderName = "X-Api-Key";
                    options.QueryName = "access_token";
                });
        }

        // A login cookie only stays valid while its identifier matches the user's current one,
        // which UserService replaces when the username or password changes or the API key is reset
        private static async Task ValidateSession(CookieValidatePrincipalContext context)
        {
            var userService = context.HttpContext.RequestServices.GetRequiredService<IUserService>();
            var identifier = context.Principal?.FindFirst("identifier")?.Value;

            if (Guid.TryParse(identifier, out var id) && userService.FindUser(id) != null)
            {
                return;
            }

            context.RejectPrincipal();

            await context.HttpContext.SignOutAsync(AuthenticationType.Forms.ToString());
        }
    }
}
