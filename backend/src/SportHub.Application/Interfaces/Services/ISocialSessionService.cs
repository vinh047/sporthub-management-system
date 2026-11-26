using SportHub.Application.DTOs.Social;

namespace SportHub.Application.Interfaces.Services;

public interface ISocialSessionService
{
    Task<IEnumerable<SocialSessionListItemDto>> SearchAsync(int? sportId, int? facilityId, decimal? minSkill, decimal? maxSkill, DateOnly? date);
    Task<IEnumerable<SocialSessionListItemDto>> ManageAsync(int userId);
    Task<SocialSessionListItemDto> GetAsync(int id, int? userId);
    Task<SocialSessionListItemDto> CreateAsync(CreateSocialSessionDto input, int userId);
    Task<SocialSessionListItemDto> UpdateAsync(int id, CreateSocialSessionDto input, int userId);
    Task CancelAsync(int id, int userId);
}
