using Microsoft.Owin;
using Owin;

[assembly: OwinStartupAttribute(typeof(dnd_sota.Startup))]
namespace dnd_sota
{
    public partial class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            ConfigureAuth(app);
        }
    }
}
